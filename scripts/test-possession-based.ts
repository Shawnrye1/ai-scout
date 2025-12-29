/**
 * Possession-Based Shot Detection
 * Instead of counting "all shots", count possession-ending events
 * This should eliminate double-counting from offensive rebounds
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

// Key insight: Only count shots that END a possession
const PROMPT = `You are a basketball statistician. Your job is to track POSSESSIONS and SCORING.

CRITICAL CONCEPT - POSSESSION TRACKING:
A possession ends when ONE of these happens:
1. MADE BASKET - ball goes through the hoop (score points)
2. DEFENSIVE REBOUND - other team gets the ball after a miss
3. TURNOVER - steal, bad pass, violation
4. FOUL - shooting foul or regular foul

DO NOT count offensive rebounds as new possessions - they continue the same possession.

TEAMS:
- HOME: Osseo Orioles (WHITE jerseys)
- AWAY: Park Center Pirates (GREEN jerseys)

For each SCORING possession (made basket or made free throws), record:
- Video timestamp
- Which team scored
- Points (1, 2, or 3)
- Jersey number if visible
- Brief description

IMPORTANT RULES:
1. An offensive rebound followed by a putback is ONE scoring event, not two
2. Free throws after a foul: count each MADE free throw separately (1 pt each)
3. Only count during LIVE GAME PLAY - ignore warmups, timeouts, halftime
4. If a player misses and their teammate tips it in, that's ONE possession with ONE made basket

Return JSON:
{
  "possessions": [
    {
      "timestamp": "MM:SS",
      "team": "home|away",
      "result": "made_basket|made_ft",
      "points": 1|2|3,
      "jersey": number|null,
      "description": "brief description"
    }
  ],
  "summary": {
    "homePossessions": number,
    "awayPossessions": number,
    "homePoints": number,
    "awayPoints": number,
    "totalPoints": number
  }
}`;

async function main() {
  console.log('POSSESSION-BASED DETECTION');
  console.log('==========================');
  console.log('Approach: Track possessions, not individual shot attempts');
  console.log('Key: Offensive rebounds continue same possession');
  console.log('');
  console.log('GROUND TRUTH (First Half):');
  console.log(`  HOME: ${GROUND_TRUTH.home.score} pts`);
  console.log(`  AWAY: ${GROUND_TRUTH.away.score} pts`);
  console.log(`  TOTAL: ${GROUND_TRUTH.total} pts`);
  console.log('');

  const gameId = 'e56d8270-b3ae-41f2-97f6-c99de469ec8f';
  const tempDir = os.tmpdir();
  const clipPath = path.join(tempDir, 'test-first-half.mp4');

  if (!fs.existsSync(clipPath)) {
    console.error('First half clip not found. Run test-first-half.ts first.');
    process.exit(1);
  }

  const clipSize = fs.statSync(clipPath).size / (1024 * 1024);
  console.log(`Using existing clip: ${clipSize.toFixed(1)} MB`);

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

  console.log('Using model: gemini-3-pro-preview');

  // Upload
  console.log('\nUploading to Gemini...');
  const startUpload = Date.now();

  let uploadResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      uploadResult = await fileManager.uploadFile(clipPath, {
        mimeType: 'video/mp4',
        displayName: 'possession-based-test',
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
  console.log('\nAnalyzing possessions...');
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

  console.log(`\nHOME (Osseo, White):`);
  console.log(`  Detected: ${homePoints} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.home.score} pts`);
  console.log(`  Diff:     ${homePoints - GROUND_TRUTH.home.score} ${homePoints === GROUND_TRUTH.home.score ? '✅' : '❌'}`);

  console.log(`\nAWAY (Park Center, Green):`);
  console.log(`  Detected: ${awayPoints} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.away.score} pts`);
  console.log(`  Diff:     ${awayPoints - GROUND_TRUTH.away.score} ${awayPoints === GROUND_TRUTH.away.score ? '✅' : '❌'}`);

  const totalDetected = homePoints + awayPoints;
  console.log(`\nTOTAL:`);
  console.log(`  Detected: ${totalDetected} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.total} pts`);
  console.log(`  Diff:     ${totalDetected - GROUND_TRUTH.total} ${totalDetected === GROUND_TRUTH.total ? '✅' : '❌'}`);

  const accuracy = Math.round((1 - Math.abs(totalDetected - GROUND_TRUTH.total) / GROUND_TRUTH.total) * 100);
  console.log(`\nAccuracy: ${accuracy}%`);

  console.log('\n=== SCORING POSSESSIONS ===');
  const possessions = parsed.possessions || [];
  for (const p of possessions) {
    const pts = p.points === 1 ? 'FT' : p.points === 2 ? '2pt' : '3pt';
    console.log(`  ${p.timestamp} - ${p.team.toUpperCase()} #${p.jersey || '?'} ${pts} (+${p.points}) - ${p.description || ''}`);
  }

  console.log(`\nTotal scoring possessions: ${possessions.length}`);

  // Breakdown by type
  const twos = possessions.filter((p: any) => p.points === 2).length;
  const threes = possessions.filter((p: any) => p.points === 3).length;
  const fts = possessions.filter((p: any) => p.points === 1).length;
  console.log(`  2-pointers: ${twos}`);
  console.log(`  3-pointers: ${threes}`);
  console.log(`  Free throws: ${fts}`);
}

main().catch(console.error);
