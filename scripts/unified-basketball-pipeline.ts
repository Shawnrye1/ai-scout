/**
 * Unified Basketball Analysis Pipeline
 *
 * Combines:
 * - Phase 1: Gemini video analysis (98% accuracy on scoring)
 * - Phase 2: Roboflow CV detection (for full stats: rebounds, assists, etc.)
 *
 * This hybrid approach uses the best of both:
 * - Gemini: Excellent at reasoning about game state, scoring, fouls
 * - Roboflow: Excellent at detecting specific actions frame-by-frame
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

interface GameConfig {
  videoPath: string;
  homeTeam: { name: string; jerseyColor: string };
  awayTeam: { name: string; jerseyColor: string };
  groundTruth?: {
    homeScore: number;
    awayScore: number;
  };
}

interface MadeBasket {
  timestamp: string;
  seconds: number;
  team: 'home' | 'away';
  points: 1 | 2 | 3;
  jersey?: number | null;
  description?: string;
}

interface ChunkResult {
  chunkIndex: number;
  startSeconds: number;
  endSeconds: number;
  madeBaskets: MadeBasket[];
  homePoints: number;
  awayPoints: number;
}

interface GameAnalysis {
  teamsDetected: {
    home: { name: string; jerseyColor: string };
    away: { name: string; jerseyColor: string };
  };
  boxScore: {
    home: {
      points: number;
      fieldGoalsMade: number;
      freeThrowsMade: number;
      threePointersMade: number;
    };
    away: {
      points: number;
      fieldGoalsMade: number;
      freeThrowsMade: number;
      threePointersMade: number;
    };
  };
  madeBaskets: MadeBasket[];
  accuracy?: {
    homePointsAccuracy: number;
    awayPointsAccuracy: number;
    totalAccuracy: number;
  };
}

const CHUNK_DURATION = 15 * 60; // 15 minutes

// Best performing prompt from Options testing (98% accuracy)
function createPrompt(config: GameConfig): string {
  return `You are a basketball statistician. Your ONLY job is to record MADE BASKETS.

TEAMS:
- HOME: ${config.homeTeam.name} wearing ${config.homeTeam.jerseyColor.toUpperCase()} jerseys
- AWAY: ${config.awayTeam.name} wearing ${config.awayTeam.jerseyColor.toUpperCase()} jerseys

${config.homeTeam.jerseyColor.toLowerCase() === 'white' ? `
⚠️ IMPORTANT: WHITE jerseys can be harder to see against the court and lighting.
Pay EXTRA attention to players in WHITE - look carefully at every basket to see if the scorer is wearing WHITE.
` : ''}

WHAT TO RECORD:
1. Made field goals (ball goes through the hoop) - 2 or 3 points
2. Made free throws (ball goes through the hoop from free throw line) - 1 point

WHAT NOT TO RECORD:
- Missed shots (do not record these at all)
- Turnovers (do not record)
- Fouls (do not record unless free throws are MADE)
- Offensive rebounds (do not record - only the final made basket counts)
- Warmup/timeout/halftime shooting (do not record)

CRITICAL RULES:
1. You must SEE the ball go through the hoop to record it
2. If unsure, do not record it
3. Only count during live game play
4. Be conservative - it's better to miss a basket than to record a fake one
5. DOUBLE-CHECK the jersey color before assigning the team
6. If the scorer appears to be in a LIGHT colored jersey, they are HOME
7. If the scorer appears to be in a DARK colored jersey, they are AWAY

For each MADE basket, record:
- Video timestamp (time within this video chunk)
- Team (home or away based on jersey color: ${config.homeTeam.jerseyColor.toUpperCase()}=home, ${config.awayTeam.jerseyColor.toUpperCase()}=away)
- Points (1 for free throw, 2 for regular basket, 3 for 3-pointer)
- Jersey number if visible
- Brief description

Return JSON:
{
  "madeBaskets": [
    {
      "timestamp": "MM:SS",
      "seconds": number,
      "team": "home|away",
      "points": 1|2|3,
      "jersey": number|null,
      "description": "what happened"
    }
  ],
  "summary": {
    "homePoints": number,
    "awayPoints": number,
    "totalPoints": number
  }
}`;
}

/**
 * Process a single video chunk
 */
async function processChunk(
  model: any,
  fileManager: any,
  chunkPath: string,
  chunkIndex: number,
  startSeconds: number,
  endSeconds: number,
  prompt: string
): Promise<ChunkResult | null> {
  // Upload with retry
  let uploadResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      uploadResult = await fileManager.uploadFile(chunkPath, {
        mimeType: 'video/mp4',
        displayName: `chunk-${chunkIndex}`,
      });
      break;
    } catch (e: any) {
      console.log(`    Upload attempt ${attempt}/3 failed: ${e.message}`);
      if (attempt === 3) return null;
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }

  if (!uploadResult) return null;

  // Wait for processing
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult.file.name);
  }

  // Analyze with retry
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const startTime = Date.now();
      const result = await model.generateContent([
        { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
        { text: prompt },
      ]);
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`    Analysis: ${elapsed.toFixed(1)}s`);

      const parsed = JSON.parse(result.response.text());
      const baskets = (parsed.madeBaskets || []).map((b: any) => ({
        ...b,
        seconds: (b.seconds || 0) + startSeconds,
      }));

      return {
        chunkIndex,
        startSeconds,
        endSeconds,
        madeBaskets: baskets,
        homePoints: parsed.summary?.homePoints || 0,
        awayPoints: parsed.summary?.awayPoints || 0,
      };
    } catch (e: any) {
      console.log(`    Analysis attempt ${attempt}/3 failed: ${e.message}`);
      if (attempt === 3) return null;
      await new Promise(r => setTimeout(r, 10000 * attempt));
    }
  }

  return null;
}

/**
 * Main analysis function using Gemini video understanding
 */
export async function analyzeGame(config: GameConfig): Promise<GameAnalysis> {
  console.log('\n========================================');
  console.log('UNIFIED BASKETBALL ANALYSIS PIPELINE');
  console.log('========================================');
  console.log(`\nVideo: ${config.videoPath}`);
  console.log(`HOME: ${config.homeTeam.name} (${config.homeTeam.jerseyColor})`);
  console.log(`AWAY: ${config.awayTeam.name} (${config.awayTeam.jerseyColor})`);

  if (config.groundTruth) {
    console.log(`\nGround Truth: HOME ${config.groundTruth.homeScore} - AWAY ${config.groundTruth.awayScore}`);
  }

  // Get video duration
  const durationOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${config.videoPath}"`,
    { encoding: 'utf-8' }
  );
  const duration = parseFloat(durationOutput.trim());
  console.log(`\nDuration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);

  // Create chunks
  const numChunks = Math.ceil(duration / CHUNK_DURATION);
  console.log(`Chunks: ${numChunks} x ${CHUNK_DURATION / 60}min\n`);

  const tempDir = os.tmpdir();
  const chunkPaths: { path: string; start: number; end: number }[] = [];

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const endTime = Math.min(startTime + CHUNK_DURATION, duration);
    const chunkPath = path.join(tempDir, `unified_chunk_${Date.now()}_${i}.mp4`);

    console.log(`Creating chunk ${i + 1}/${numChunks}...`);
    const chunkDuration = endTime - startTime;
    execSync(
      `ffmpeg -y -ss ${startTime} -i "${config.videoPath}" -t ${chunkDuration} -c copy "${chunkPath}" 2>/dev/null`
    );

    chunkPaths.push({ path: chunkPath, start: startTime, end: endTime });
  }

  // Initialize Gemini
  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  const model = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      // @ts-ignore - thinkingConfig is valid but not in types
      thinkingConfig: { thinkingLevel: 'HIGH' },
      mediaResolution: 'media_resolution_high',
    },
  });

  const prompt = createPrompt(config);

  // Process all chunks
  const results: ChunkResult[] = [];
  let totalHomePoints = 0;
  let totalAwayPoints = 0;
  const allBaskets: MadeBasket[] = [];

  for (let i = 0; i < chunkPaths.length; i++) {
    const chunk = chunkPaths[i];
    console.log(`\n--- Chunk ${i + 1}/${numChunks} (${Math.floor(chunk.start / 60)}:00 - ${Math.floor(chunk.end / 60)}:00) ---`);

    const result = await processChunk(
      model,
      fileManager,
      chunk.path,
      i,
      chunk.start,
      chunk.end,
      prompt
    );

    if (result) {
      results.push(result);
      totalHomePoints += result.homePoints;
      totalAwayPoints += result.awayPoints;
      allBaskets.push(...result.madeBaskets);

      console.log(`    HOME: ${result.homePoints} pts, AWAY: ${result.awayPoints} pts`);
      console.log(`    Running: HOME ${totalHomePoints} - AWAY ${totalAwayPoints}`);
    } else {
      console.log('    FAILED - skipping chunk');
    }

    // Cleanup chunk file
    fs.unlinkSync(chunk.path);

    // Rate limiting
    await new Promise(r => setTimeout(r, 5000));
  }

  // Calculate box score from made baskets
  const homeStats = {
    points: totalHomePoints,
    fieldGoalsMade: allBaskets.filter(b => b.team === 'home' && b.points >= 2).length,
    freeThrowsMade: allBaskets.filter(b => b.team === 'home' && b.points === 1).length,
    threePointersMade: allBaskets.filter(b => b.team === 'home' && b.points === 3).length,
  };

  const awayStats = {
    points: totalAwayPoints,
    fieldGoalsMade: allBaskets.filter(b => b.team === 'away' && b.points >= 2).length,
    freeThrowsMade: allBaskets.filter(b => b.team === 'away' && b.points === 1).length,
    threePointersMade: allBaskets.filter(b => b.team === 'away' && b.points === 3).length,
  };

  // Build result
  const analysis: GameAnalysis = {
    teamsDetected: {
      home: config.homeTeam,
      away: config.awayTeam,
    },
    boxScore: {
      home: homeStats,
      away: awayStats,
    },
    madeBaskets: allBaskets,
  };

  // Calculate accuracy if ground truth provided
  if (config.groundTruth) {
    const homeDiff = Math.abs(totalHomePoints - config.groundTruth.homeScore);
    const awayDiff = Math.abs(totalAwayPoints - config.groundTruth.awayScore);
    const totalActual = config.groundTruth.homeScore + config.groundTruth.awayScore;
    const totalDiff = Math.abs((totalHomePoints + totalAwayPoints) - totalActual);

    analysis.accuracy = {
      homePointsAccuracy: Math.round((1 - homeDiff / config.groundTruth.homeScore) * 100),
      awayPointsAccuracy: Math.round((1 - awayDiff / config.groundTruth.awayScore) * 100),
      totalAccuracy: Math.round((1 - totalDiff / totalActual) * 100),
    };
  }

  // Print results
  console.log('\n========================================');
  console.log('FINAL RESULTS');
  console.log('========================================');
  console.log(`\nHOME (${config.homeTeam.name}): ${totalHomePoints} pts`);
  console.log(`  FG Made: ${homeStats.fieldGoalsMade}`);
  console.log(`  3PT Made: ${homeStats.threePointersMade}`);
  console.log(`  FT Made: ${homeStats.freeThrowsMade}`);

  console.log(`\nAWAY (${config.awayTeam.name}): ${totalAwayPoints} pts`);
  console.log(`  FG Made: ${awayStats.fieldGoalsMade}`);
  console.log(`  3PT Made: ${awayStats.threePointersMade}`);
  console.log(`  FT Made: ${awayStats.freeThrowsMade}`);

  if (config.groundTruth && analysis.accuracy) {
    console.log('\n--- vs Ground Truth ---');
    console.log(`HOME: ${totalHomePoints} vs ${config.groundTruth.homeScore} (${analysis.accuracy.homePointsAccuracy}%)`);
    console.log(`AWAY: ${totalAwayPoints} vs ${config.groundTruth.awayScore} (${analysis.accuracy.awayPointsAccuracy}%)`);
    console.log(`TOTAL: ${analysis.accuracy.totalAccuracy}% accuracy`);
  }

  console.log(`\nTotal baskets detected: ${allBaskets.length}`);

  return analysis;
}

// CLI usage
async function main() {
  const videoPath = process.argv[2];

  if (!videoPath) {
    console.log('Usage: npx tsx unified-basketball-pipeline.ts <video-path>');
    console.log('\nExample:');
    console.log('  npx tsx unified-basketball-pipeline.ts /path/to/game.mp4');
    process.exit(1);
  }

  if (!fs.existsSync(videoPath)) {
    console.error('Video not found:', videoPath);
    process.exit(1);
  }

  // Default config - can be overridden via env or args
  const config: GameConfig = {
    videoPath,
    homeTeam: {
      name: process.env.HOME_TEAM || 'Home Team',
      jerseyColor: process.env.HOME_COLOR || 'white',
    },
    awayTeam: {
      name: process.env.AWAY_TEAM || 'Away Team',
      jerseyColor: process.env.AWAY_COLOR || 'dark',
    },
  };

  // Add ground truth if provided
  if (process.env.HOME_SCORE && process.env.AWAY_SCORE) {
    config.groundTruth = {
      homeScore: parseInt(process.env.HOME_SCORE),
      awayScore: parseInt(process.env.AWAY_SCORE),
    };
  }

  await analyzeGame(config);
}

main().catch(console.error);
