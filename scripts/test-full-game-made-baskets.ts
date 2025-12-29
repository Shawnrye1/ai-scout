/**
 * Full Game Analysis - Made Baskets Only
 * Uses the winning prompt from first half test (94% accuracy)
 * Chunks the 90-min video into manageable pieces
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Full game ground truth
const GROUND_TRUTH = {
  home: { name: 'Osseo Orioles', jerseyColor: 'White', score: 55 },
  away: { name: 'Park Center Pirates', jerseyColor: 'Green', score: 74 },
  total: 129
};

// Chunk settings - 15 min chunks, no overlap needed for made baskets
const CHUNK_DURATION = 15 * 60; // 15 minutes

const PROMPT = `You are a basketball statistician. Your ONLY job is to record MADE BASKETS.

TEAMS:
- HOME: Osseo Orioles wearing WHITE jerseys
- AWAY: Park Center Pirates wearing GREEN jerseys

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

For each MADE basket, record:
- Video timestamp (time within this video chunk)
- Team (home or away based on jersey color: WHITE=home, GREEN=away)
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

async function main() {
  console.log('FULL GAME - MADE BASKETS ONLY');
  console.log('==============================');
  console.log('Using winning approach from first half (94% accuracy)');
  console.log('');
  console.log('GROUND TRUTH (Full Game):');
  console.log(`  HOME (${GROUND_TRUTH.home.name}): ${GROUND_TRUTH.home.score} pts`);
  console.log(`  AWAY (${GROUND_TRUTH.away.name}): ${GROUND_TRUTH.away.score} pts`);
  console.log(`  TOTAL: ${GROUND_TRUTH.total} pts`);
  console.log('');

  const gameId = 'e56d8270-b3ae-41f2-97f6-c99de469ec8f';
  const tempDir = os.tmpdir();
  const fullVideoPath = path.join(tempDir, `game-${gameId}.mp4`);

  if (!fs.existsSync(fullVideoPath)) {
    console.error('Full game video not found.');
    process.exit(1);
  }

  // Get duration
  let duration = 0;
  try {
    const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullVideoPath}"`, { encoding: 'utf-8' });
    duration = parseFloat(output.trim());
    console.log(`Video duration: ${Math.floor(duration / 60)} min ${Math.floor(duration % 60)} sec`);
  } catch (e) {
    console.error('Could not get video duration');
    process.exit(1);
  }

  // Calculate chunks
  const numChunks = Math.ceil(duration / CHUNK_DURATION);
  console.log(`Splitting into ${numChunks} chunks of ${CHUNK_DURATION / 60} minutes each`);

  // Create chunks
  const chunkPaths: { path: string; start: number; end: number }[] = [];
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const endTime = Math.min(startTime + CHUNK_DURATION, duration);
    const chunkPath = path.join(tempDir, `fullgame_chunk_${i}.mp4`);

    if (!fs.existsSync(chunkPath)) {
      console.log(`Creating chunk ${i + 1}/${numChunks}...`);
      const chunkDuration = endTime - startTime;
      execSync(`ffmpeg -y -ss ${startTime} -i "${fullVideoPath}" -t ${chunkDuration} -c copy "${chunkPath}" 2>/dev/null`);
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

  for (let i = 0; i < chunkPaths.length; i++) {
    const chunk = chunkPaths[i];
    console.log(`\n--- Chunk ${i + 1}/${numChunks} (${Math.floor(chunk.start/60)}:00 - ${Math.floor(chunk.end/60)}:00) ---`);

    // Upload with retry
    let uploadResult;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log('Uploading...');
        uploadResult = await fileManager.uploadFile(chunk.path, {
          mimeType: 'video/mp4',
          displayName: `fullgame-chunk-${i + 1}`,
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

  console.log(`\nHOME (Osseo, White):`);
  console.log(`  Detected: ${totalHomePoints} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.home.score} pts`);
  const homeDiff = totalHomePoints - GROUND_TRUTH.home.score;
  console.log(`  Diff:     ${homeDiff >= 0 ? '+' : ''}${homeDiff} ${totalHomePoints === GROUND_TRUTH.home.score ? '✅' : '❌'}`);

  console.log(`\nAWAY (Park Center, Green):`);
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

  console.log(`\nTotal made baskets detected: ${allBaskets.length}`);
}

main().catch(console.error);
