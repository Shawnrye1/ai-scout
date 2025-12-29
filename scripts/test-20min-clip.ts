/**
 * Test 20-minute clip with Gemini 3 Pro
 * Single upload, no chunking - to test accuracy without API instability
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Extract first 20 minutes of the cached game video
const CLIP_DURATION = 20 * 60; // 20 minutes in seconds
const CLIP_START = 0; // Start from beginning

const PROMPT = `You are a basketball statistician. Your job is to accurately count shot attempts during LIVE GAME PLAY ONLY.

ONLY COUNT SHOTS WHEN:
- The game clock is running (active play)
- After inbound plays (ball is live)
- On fast breaks and transition plays
- Free throws at the line after fouls

DO NOT COUNT:
- Warm-up shots before tip-off
- Shots during timeouts or dead ball situations
- Halftime or pre-game shooting
- Shots after the whistle has blown
- Practice shots between plays

COMMON MISTAKES TO AVOID:
- Missing free throws after fouls (watch for players at the free throw line)
- Missing fast break layups (these happen quickly after turnovers)
- Forgetting to count MISSED shots as attempts
- Missing and-1 plays (made shot + foul = shot attempt + possibly free throws)
- Missing tip-ins and putbacks after offensive rebounds

Count EVERY ball that goes toward the basket during live play, whether it goes in or not.

CRITICAL - TEAM IDENTIFICATION:
1. First, identify the TWO distinct jersey colors on the court
2. HOME team typically wears LIGHT/WHITE jerseys
3. AWAY team typically wears DARK/COLORED jerseys
4. Before logging any shot, VERIFY the jersey color matches the team assignment
5. If you see a player in a dark jersey, they are AWAY
6. If you see a player in a light/white jersey, they are HOME
7. Double-check every shot - incorrect team assignment ruins the stats

Return JSON:
{
  "gameInfo": {
    "teams": {
      "home": { "name": "team name", "jerseyColor": "color description" },
      "away": { "name": "team name", "jerseyColor": "color description" }
    }
  },
  "shots": [
    { "time": "M:SS", "seconds": number, "jersey": number, "team": "home|away", "type": "2pt|3pt|ft", "result": "made|missed", "description": "brief" }
  ],
  "summary": {
    "homeScore": number,
    "awayScore": number,
    "totalScore": number,
    "totalAttempts": number,
    "totalMakes": number
  }
}`;

async function main() {
  console.log('20-MINUTE CLIP TEST');
  console.log('===================');
  console.log('Model: Gemini 3 Pro with media_resolution: high');
  console.log('Clip: First 20 minutes of game');
  console.log('');

  const gameId = 'e56d8270-b3ae-41f2-97f6-c99de469ec8f';
  const tempDir = os.tmpdir();
  const fullVideoPath = path.join(tempDir, `game-${gameId}.mp4`);
  const clipPath = path.join(tempDir, 'test-20min-clip.mp4');

  // Check if full video exists
  if (!fs.existsSync(fullVideoPath)) {
    console.error('Full game video not found. Run the overlapping analysis first to download it.');
    process.exit(1);
  }

  // Extract 20-minute clip
  console.log('Extracting 20-minute clip...');
  execSync(`ffmpeg -y -ss ${CLIP_START} -i "${fullVideoPath}" -t ${CLIP_DURATION} -c copy "${clipPath}" 2>/dev/null`);

  const clipSize = fs.statSync(clipPath).size / (1024 * 1024);
  console.log(`Clip size: ${clipSize.toFixed(1)} MB`);

  // Initialize Gemini
  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  const model = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      // @ts-ignore
      thinkingConfig: { thinkingLevel: 'HIGH' },
      mediaResolution: 'media_resolution_high',
    },
  });

  // Upload clip
  console.log('\nUploading to Gemini...');
  const startUpload = Date.now();

  let uploadResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      uploadResult = await fileManager.uploadFile(clipPath, {
        mimeType: 'video/mp4',
        displayName: 'test-20min-clip',
      });
      break;
    } catch (e: any) {
      console.log(`  Upload attempt ${attempt}/3 failed: ${e.message}`);
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }

  console.log(`Upload time: ${((Date.now() - startUpload) / 1000).toFixed(1)}s`);

  // Wait for processing
  console.log('Waiting for Gemini to process...');
  let file = await fileManager.getFile(uploadResult!.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult!.file.name);
    process.stdout.write('.');
  }
  console.log(' Ready!');

  // Analyze
  console.log('\nAnalyzing with Gemini 3 Pro...');
  const startAnalysis = Date.now();

  let result;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      result = await model.generateContent([
        { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
        { text: PROMPT },
      ]);
      break;
    } catch (e: any) {
      console.log(`  Analysis attempt ${attempt}/3 failed: ${e.message}`);
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 10000 * attempt));
    }
  }

  const analysisTime = (Date.now() - startAnalysis) / 1000;
  console.log(`Analysis time: ${analysisTime.toFixed(1)}s`);

  // Parse results
  const text = result!.response.text();
  const parsed = JSON.parse(text);

  console.log('\n=== RESULTS ===');
  console.log(`Teams: ${parsed.gameInfo?.teams?.home?.name || 'Home'} (${parsed.gameInfo?.teams?.home?.jerseyColor}) vs ${parsed.gameInfo?.teams?.away?.name || 'Away'} (${parsed.gameInfo?.teams?.away?.jerseyColor})`);

  const shots = parsed.shots || [];
  const homeShots = shots.filter((s: any) => s.team === 'home');
  const awayShots = shots.filter((s: any) => s.team === 'away');

  const homeScore = homeShots.filter((s: any) => s.result === 'made').reduce((sum: number, s: any) => {
    if (s.type === '3pt') return sum + 3;
    if (s.type === '2pt') return sum + 2;
    if (s.type === 'ft') return sum + 1;
    return sum;
  }, 0);

  const awayScore = awayShots.filter((s: any) => s.result === 'made').reduce((sum: number, s: any) => {
    if (s.type === '3pt') return sum + 3;
    if (s.type === '2pt') return sum + 2;
    if (s.type === 'ft') return sum + 1;
    return sum;
  }, 0);

  console.log(`\nTotal shots detected: ${shots.length}`);
  console.log(`Home: ${homeShots.length} attempts, ${homeScore} points`);
  console.log(`Away: ${awayShots.length} attempts, ${awayScore} points`);
  console.log(`Combined: ${homeScore + awayScore} points`);

  console.log('\n=== SHOT LOG ===');
  for (const shot of shots) {
    const result = shot.result === 'made' ? '✓' : '✗';
    console.log(`  ${shot.time} - #${shot.jersey} (${shot.team}) ${shot.type} ${result} - ${shot.description || ''}`);
  }

  console.log('\n=== BY PLAYER ===');
  const playerStats = new Map<string, { attempts: number; makes: number; points: number }>();

  for (const shot of shots) {
    const key = `${shot.team}-#${shot.jersey}`;
    if (!playerStats.has(key)) {
      playerStats.set(key, { attempts: 0, makes: 0, points: 0 });
    }
    const stats = playerStats.get(key)!;
    stats.attempts++;
    if (shot.result === 'made') {
      stats.makes++;
      if (shot.type === '3pt') stats.points += 3;
      else if (shot.type === '2pt') stats.points += 2;
      else if (shot.type === 'ft') stats.points += 1;
    }
  }

  for (const [player, stats] of [...playerStats.entries()].sort((a, b) => b[1].points - a[1].points)) {
    console.log(`  ${player}: ${stats.attempts} att, ${stats.makes} made, ${stats.points} pts`);
  }

  console.log('\n=== SUMMARY ===');
  console.log('This is the first 20 minutes of the game.');
  console.log('Compare these numbers against the actual box score for that period.');
  console.log(`Detected: HOME ${homeScore} - AWAY ${awayScore} (Total: ${homeScore + awayScore})`);
}

main().catch(console.error);
