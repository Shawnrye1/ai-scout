/**
 * Game 2 Analysis - MVA vs PRO
 * Using 98% accuracy approach from Options testing
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Ground truth for Game 2
const GROUND_TRUTH = {
  home: { name: 'MVA', score: 78 },
  away: { name: 'PRO', score: 72 },
  total: 150,
  checkpoints: [
    { timestamp: '28:28', homeScore: 35, awayScore: 39 },
    { timestamp: '60:01', homeScore: 78, awayScore: 72 }
  ]
};

const CHUNK_DURATION = 15 * 60; // 15 minutes

// Using Option A approach (verification count) which achieved 98% accuracy
const PROMPT = `You are a basketball statistician. Your ONLY job is to record MADE BASKETS.

IMPORTANT: Watch carefully to identify jersey colors for each team. One team wears lighter/white jerseys (call them "home"), the other wears darker jerseys (call them "away").

WHAT TO RECORD:
1. Made field goals (ball goes through the hoop) - 2 or 3 points
2. Made free throws (ball goes through the hoop from free throw line) - 1 point

WHAT NOT TO RECORD:
- Missed shots (do not record these at all)
- Turnovers, fouls, offensive rebounds
- Warmup/timeout/halftime shooting

CRITICAL RULES:
1. You must SEE the ball go through the hoop to record it
2. If unsure, do not record it
3. Only count during live game play
4. Be conservative - it's better to miss a basket than to record a fake one
5. DOUBLE-CHECK the jersey color before assigning the team

For each MADE basket, record:
- Video timestamp (time within this video chunk)
- Team (home or away based on jersey color observed)
- Points (1 for free throw, 2 for regular basket, 3 for 3-pointer)
- Jersey number if visible
- Jersey color observed (to help verify team assignment)

Return JSON:
{
  "teamsDetected": {
    "home": { "jerseyColor": "string", "name": "string if visible" },
    "away": { "jerseyColor": "string", "name": "string if visible" }
  },
  "madeBaskets": [
    {
      "timestamp": "MM:SS",
      "seconds": number,
      "team": "home|away",
      "points": 1|2|3,
      "jersey": number|null,
      "jerseyColorObserved": "string"
    }
  ],
  "summary": {
    "homePoints": number,
    "awayPoints": number,
    "totalPoints": number
  }
}`;

async function main() {
  console.log('GAME 2 - MVA vs PRO');
  console.log('===================');
  console.log('Using 98% accuracy approach from Options testing\n');
  console.log('GROUND TRUTH:');
  console.log(`  HOME (${GROUND_TRUTH.home.name}): ${GROUND_TRUTH.home.score} pts`);
  console.log(`  AWAY (${GROUND_TRUTH.away.name}): ${GROUND_TRUTH.away.score} pts`);
  console.log(`  TOTAL: ${GROUND_TRUTH.total} pts`);
  console.log('\nCheckpoints:');
  for (const cp of GROUND_TRUTH.checkpoints) {
    console.log(`  At ${cp.timestamp}: ${GROUND_TRUTH.home.name} ${cp.homeScore} - ${GROUND_TRUTH.away.name} ${cp.awayScore}`);
  }

  const videoPath = '/Users/shawnearl/Downloads/basketball_dybantsa_flagg.mp4';

  if (!fs.existsSync(videoPath)) {
    console.error('\nVideo not found at:', videoPath);
    process.exit(1);
  }

  // Get duration
  let duration = 0;
  try {
    const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`, { encoding: 'utf-8' });
    duration = parseFloat(output.trim());
    console.log(`\nVideo duration: ${Math.floor(duration / 60)} min ${Math.floor(duration % 60)} sec`);
  } catch (e) {
    console.error('Could not get video duration');
    process.exit(1);
  }

  // Calculate chunks
  const numChunks = Math.ceil(duration / CHUNK_DURATION);
  console.log(`Splitting into ${numChunks} chunks of ${CHUNK_DURATION / 60} minutes each`);

  // Create chunks
  const tempDir = os.tmpdir();
  const chunkPaths: { path: string; start: number; end: number }[] = [];

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const endTime = Math.min(startTime + CHUNK_DURATION, duration);
    const chunkPath = path.join(tempDir, `game2_chunk_${i}.mp4`);

    if (!fs.existsSync(chunkPath)) {
      console.log(`Creating chunk ${i + 1}/${numChunks}...`);
      const chunkDuration = endTime - startTime;
      execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${chunkDuration} -c copy "${chunkPath}" 2>/dev/null`);
    } else {
      console.log(`Chunk ${i + 1}/${numChunks} already exists`);
    }

    chunkPaths.push({ path: chunkPath, start: startTime, end: endTime });
  }

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

  // Upload and analyze each chunk
  const allBaskets: any[] = [];
  let totalHomePoints = 0;
  let totalAwayPoints = 0;
  let detectedTeams: any = null;

  for (let i = 0; i < chunkPaths.length; i++) {
    const chunk = chunkPaths[i];
    const startMin = Math.floor(chunk.start / 60);
    const endMin = Math.floor(chunk.end / 60);
    console.log(`\n--- Chunk ${i + 1}/${numChunks} (${startMin}:00 - ${endMin}:00) ---`);

    // Upload with retry
    let uploadResult;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log('Uploading...');
        uploadResult = await fileManager.uploadFile(chunk.path, {
          mimeType: 'video/mp4',
          displayName: `game2-chunk-${i + 1}`,
        });
        break;
      } catch (e: any) {
        console.log(`  Upload attempt ${attempt}/3 failed: ${e.message}`);
        if (attempt === 3) {
          console.log('  Skipping chunk due to upload failure');
          continue;
        }
        await new Promise(r => setTimeout(r, 5000 * attempt));
      }
    }

    if (!uploadResult) continue;

    // Wait for processing
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === 'PROCESSING') {
      await new Promise(r => setTimeout(r, 3000));
      file = await fileManager.getFile(uploadResult.file.name);
    }
    console.log('Processing complete');

    // Analyze with retry
    let result;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log('Analyzing...');
        const startTime = Date.now();
        result = await model.generateContent([
          { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
          { text: PROMPT },
        ]);
        console.log(`  Analysis time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        break;
      } catch (e: any) {
        console.log(`  Analysis attempt ${attempt}/3 failed: ${e.message}`);
        if (attempt === 3) {
          console.log('  Skipping chunk due to analysis failure');
          continue;
        }
        await new Promise(r => setTimeout(r, 10000 * attempt));
      }
    }

    if (!result) continue;

    // Parse and aggregate
    try {
      const text = result.response.text();
      const parsed = JSON.parse(text);

      // Capture team detection from first chunk
      if (!detectedTeams && parsed.teamsDetected) {
        detectedTeams = parsed.teamsDetected;
        console.log(`  Teams detected: HOME=${detectedTeams.home?.jerseyColor || 'unknown'}, AWAY=${detectedTeams.away?.jerseyColor || 'unknown'}`);
      }

      const baskets = parsed.madeBaskets || [];
      const homePoints = parsed.summary?.homePoints || 0;
      const awayPoints = parsed.summary?.awayPoints || 0;

      console.log(`  Found: HOME ${homePoints} pts, AWAY ${awayPoints} pts (${baskets.length} baskets)`);

      totalHomePoints += homePoints;
      totalAwayPoints += awayPoints;

      // Add baskets with adjusted timestamps
      for (const b of baskets) {
        allBaskets.push({
          ...b,
          globalSeconds: (b.seconds || 0) + chunk.start,
          chunkIndex: i,
        });
      }

      // Check against checkpoint if we've passed one
      const currentGameTime = chunk.end;
      for (const cp of GROUND_TRUTH.checkpoints) {
        const cpParts = cp.timestamp.split(':');
        const cpSeconds = parseInt(cpParts[0]) * 60 + parseInt(cpParts[1]);
        if (currentGameTime >= cpSeconds && currentGameTime < cpSeconds + CHUNK_DURATION) {
          console.log(`  📍 Checkpoint ${cp.timestamp}: Expected HOME ${cp.homeScore} - AWAY ${cp.awayScore}`);
          console.log(`     Running total: HOME ${totalHomePoints} - AWAY ${totalAwayPoints}`);
        }
      }
    } catch (e: any) {
      console.log(`  Error parsing response: ${e.message}`);
    }

    // Wait between chunks to avoid rate limiting
    await new Promise(r => setTimeout(r, 5000));
  }

  // Final results
  console.log('\n' + '='.repeat(60));
  console.log('FINAL RESULTS vs GROUND TRUTH');
  console.log('='.repeat(60));

  if (detectedTeams) {
    console.log(`\nTeams Detected:`);
    console.log(`  HOME: ${detectedTeams.home?.name || 'Unknown'} (${detectedTeams.home?.jerseyColor || 'unknown'} jerseys)`);
    console.log(`  AWAY: ${detectedTeams.away?.name || 'Unknown'} (${detectedTeams.away?.jerseyColor || 'unknown'} jerseys)`);
  }

  console.log(`\nHOME (${GROUND_TRUTH.home.name}):`);
  console.log(`  Detected: ${totalHomePoints} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.home.score} pts`);
  const homeDiff = totalHomePoints - GROUND_TRUTH.home.score;
  console.log(`  Diff:     ${homeDiff >= 0 ? '+' : ''}${homeDiff} ${totalHomePoints === GROUND_TRUTH.home.score ? '✅' : '❌'}`);

  console.log(`\nAWAY (${GROUND_TRUTH.away.name}):`);
  console.log(`  Detected: ${totalAwayPoints} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.away.score} pts`);
  const awayDiff = totalAwayPoints - GROUND_TRUTH.away.score;
  console.log(`  Diff:     ${awayDiff >= 0 ? '+' : ''}${awayDiff} ${totalAwayPoints === GROUND_TRUTH.away.score ? '✅' : '❌'}`);

  const totalDetected = totalHomePoints + totalAwayPoints;
  console.log(`\nTOTAL:`);
  console.log(`  Detected: ${totalDetected} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.total} pts`);
  const totalDiff = totalDetected - GROUND_TRUTH.total;
  console.log(`  Diff:     ${totalDiff >= 0 ? '+' : ''}${totalDiff} ${totalDetected === GROUND_TRUTH.total ? '✅' : '❌'}`);

  const accuracy = Math.round((1 - Math.abs(totalDetected - GROUND_TRUTH.total) / GROUND_TRUTH.total) * 100);
  console.log(`\nAccuracy: ${accuracy}%`);
  console.log(`Total made baskets detected: ${allBaskets.length}`);
}

main().catch(console.error);
