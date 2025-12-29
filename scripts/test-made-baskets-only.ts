/**
 * Made Baskets Only Detection
 * ONLY record when the ball goes through the hoop
 * No misses, no turnovers, just makes
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const GROUND_TRUTH = {
  home: { name: 'Osseo Orioles', jerseyColor: 'White', score: 22 },
  away: { name: 'Park Center Pirates', jerseyColor: 'Green', score: 31 },
  total: 53
};

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
- Video timestamp
- Team (home or away based on jersey color: WHITE=home, GREEN=away)
- Points (1 for free throw, 2 for regular basket, 3 for 3-pointer)
- Jersey number if visible
- Brief description

Return JSON:
{
  "madeBaskets": [
    {
      "timestamp": "MM:SS",
      "team": "home|away",
      "points": 1|2|3,
      "jersey": number|null,
      "description": "what happened"
    }
  ],
  "summary": {
    "homePoints": number,
    "awayPoints": number,
    "totalPoints": number,
    "homeMakes": number,
    "awayMakes": number
  }
}`;

async function main() {
  console.log('MADE BASKETS ONLY DETECTION');
  console.log('===========================');
  console.log('Approach: Only record when ball goes through hoop');
  console.log('No misses, no turnovers - just makes');
  console.log('');
  console.log('GROUND TRUTH (First Half):');
  console.log(`  HOME: ${GROUND_TRUTH.home.score} pts`);
  console.log(`  AWAY: ${GROUND_TRUTH.away.score} pts`);
  console.log(`  TOTAL: ${GROUND_TRUTH.total} pts`);
  console.log('');

  const tempDir = os.tmpdir();
  const clipPath = path.join(tempDir, 'test-first-half.mp4');

  if (!fs.existsSync(clipPath)) {
    console.error('First half clip not found.');
    process.exit(1);
  }

  const clipSize = fs.statSync(clipPath).size / (1024 * 1024);
  console.log(`Using clip: ${clipSize.toFixed(1)} MB`);

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

  console.log('Using model: gemini-3-pro-preview\n');

  // Upload
  console.log('Uploading to Gemini...');
  const startUpload = Date.now();

  let uploadResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      uploadResult = await fileManager.uploadFile(clipPath, {
        mimeType: 'video/mp4',
        displayName: 'made-baskets-only-test',
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
  console.log('\nAnalyzing made baskets...');
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

  console.log('\n' + '='.repeat(50));
  console.log('RESULTS vs GROUND TRUTH');
  console.log('='.repeat(50));

  const homePoints = parsed.summary?.homePoints || 0;
  const awayPoints = parsed.summary?.awayPoints || 0;
  const totalDetected = homePoints + awayPoints;

  console.log(`\nHOME (Osseo, White):`);
  console.log(`  Detected: ${homePoints} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.home.score} pts`);
  const homeDiff = homePoints - GROUND_TRUTH.home.score;
  console.log(`  Diff:     ${homeDiff >= 0 ? '+' : ''}${homeDiff} ${homePoints === GROUND_TRUTH.home.score ? '✅' : '❌'}`);

  console.log(`\nAWAY (Park Center, Green):`);
  console.log(`  Detected: ${awayPoints} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.away.score} pts`);
  const awayDiff = awayPoints - GROUND_TRUTH.away.score;
  console.log(`  Diff:     ${awayDiff >= 0 ? '+' : ''}${awayDiff} ${awayPoints === GROUND_TRUTH.away.score ? '✅' : '❌'}`);

  console.log(`\nTOTAL:`);
  console.log(`  Detected: ${totalDetected} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.total} pts`);
  const totalDiff = totalDetected - GROUND_TRUTH.total;
  console.log(`  Diff:     ${totalDiff >= 0 ? '+' : ''}${totalDiff} ${totalDetected === GROUND_TRUTH.total ? '✅' : '❌'}`);

  const accuracy = Math.round((1 - Math.abs(totalDetected - GROUND_TRUTH.total) / GROUND_TRUTH.total) * 100);
  console.log(`\nAccuracy: ${accuracy}%`);

  console.log('\n=== MADE BASKETS LOG ===');
  const baskets = parsed.madeBaskets || [];
  for (const b of baskets) {
    const pts = b.points === 1 ? 'FT' : b.points === 2 ? '2pt' : '3pt';
    console.log(`  ${b.timestamp} - ${b.team.toUpperCase()} #${b.jersey || '?'} ${pts} - ${b.description || ''}`);
  }

  console.log(`\nTotal made baskets: ${baskets.length}`);

  // By team
  const homeBaskets = baskets.filter((b: any) => b.team === 'home');
  const awayBaskets = baskets.filter((b: any) => b.team === 'away');
  console.log(`  Home makes: ${homeBaskets.length}`);
  console.log(`  Away makes: ${awayBaskets.length}`);
}

main().catch(console.error);
