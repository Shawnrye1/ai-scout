/**
 * Test First Half with Gemini 3 Pro
 * Video: 0:00 to 42:33 (first half)
 * Actual Score: HOME (Osseo, White) 22 - AWAY (Park Center, Green) 31
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// First half: 0 to 42:33 (2553 seconds)
const CLIP_DURATION = 42 * 60 + 33; // 42 minutes 33 seconds
const CLIP_START = 0;

// Ground truth for first half
const GROUND_TRUTH = {
  home: { name: 'Osseo Orioles', jerseyColor: 'White', score: 22 },
  away: { name: 'Park Center Pirates', jerseyColor: 'Green', score: 31 },
  total: 53
};

const PROMPT = `You are a basketball statistician analyzing the FIRST HALF of a high school basketball game.

CRITICAL - TEAM IDENTIFICATION (READ CAREFULLY):
- HOME team: Osseo Orioles wearing WHITE jerseys
- AWAY team: Park Center Pirates wearing GREEN jerseys
- Players in WHITE = HOME (Osseo)
- Players in GREEN = AWAY (Park Center)
- VERIFY jersey color before assigning each shot to a team

ONLY COUNT SHOTS DURING LIVE GAME PLAY:
- When the game clock is running
- After inbound plays
- On fast breaks and transition plays
- Free throws at the line after fouls

DO NOT COUNT:
- Warm-up shots before tip-off
- Shots during timeouts or dead ball situations
- Halftime shooting
- Shots after the whistle

COMMON MISTAKES TO AVOID:
- Missing free throws after fouls
- Missing fast break layups
- Forgetting to count MISSED shots as attempts
- Missing and-1 plays
- Missing tip-ins and putbacks

Return JSON:
{
  "gameInfo": {
    "period": "1st Half",
    "teams": {
      "home": { "name": "Osseo Orioles", "jerseyColor": "White" },
      "away": { "name": "Park Center Pirates", "jerseyColor": "Green" }
    }
  },
  "shots": [
    { "time": "M:SS", "seconds": number, "jersey": number, "team": "home|away", "type": "2pt|3pt|ft", "result": "made|missed", "description": "brief" }
  ],
  "summary": {
    "homeScore": number,
    "awayScore": number,
    "totalScore": number
  }
}`;

async function main() {
  console.log('FIRST HALF ANALYSIS');
  console.log('====================');
  console.log('Model: Gemini 3 Pro with media_resolution: high');
  console.log('Clip: 0:00 to 42:33 (First Half)');
  console.log('');
  console.log('GROUND TRUTH:');
  console.log(`  HOME (${GROUND_TRUTH.home.name}, ${GROUND_TRUTH.home.jerseyColor}): ${GROUND_TRUTH.home.score} pts`);
  console.log(`  AWAY (${GROUND_TRUTH.away.name}, ${GROUND_TRUTH.away.jerseyColor}): ${GROUND_TRUTH.away.score} pts`);
  console.log(`  TOTAL: ${GROUND_TRUTH.total} pts`);
  console.log('');

  const gameId = 'e56d8270-b3ae-41f2-97f6-c99de469ec8f';
  const tempDir = os.tmpdir();
  const fullVideoPath = path.join(tempDir, `game-${gameId}.mp4`);
  const clipPath = path.join(tempDir, 'test-first-half.mp4');

  if (!fs.existsSync(fullVideoPath)) {
    console.error('Full game video not found.');
    process.exit(1);
  }

  // Extract first half clip
  console.log('Extracting first half clip (42:33)...');
  execSync(`ffmpeg -y -ss ${CLIP_START} -i "${fullVideoPath}" -t ${CLIP_DURATION} -c copy "${clipPath}" 2>/dev/null`);

  const clipSize = fs.statSync(clipPath).size / (1024 * 1024);
  console.log(`Clip size: ${clipSize.toFixed(1)} MB`);

  // Initialize Gemini
  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Use model from env or default to 2.5 Flash
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  console.log(`Using model: ${modelName}`);

  const model = genai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      ...(modelName.includes('3-pro') ? { thinkingConfig: { thinkingLevel: 'HIGH' } } : {}),
      mediaResolution: 'media_resolution_high',
    } as any,
  });

  // Upload with retry
  console.log('\nUploading to Gemini...');
  const startUpload = Date.now();

  let uploadResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      uploadResult = await fileManager.uploadFile(clipPath, {
        mimeType: 'video/mp4',
        displayName: 'first-half-test',
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

  // Analyze with retry
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

  const shots = parsed.shots || [];

  // Calculate scores from shots
  const homeShots = shots.filter((s: any) => s.team === 'home');
  const awayShots = shots.filter((s: any) => s.team === 'away');

  const calcScore = (shotList: any[]) => shotList.filter((s: any) => s.result === 'made').reduce((sum: number, s: any) => {
    if (s.type === '3pt') return sum + 3;
    if (s.type === '2pt') return sum + 2;
    if (s.type === 'ft') return sum + 1;
    return sum;
  }, 0);

  const homeScore = calcScore(homeShots);
  const awayScore = calcScore(awayShots);

  console.log('\n' + '='.repeat(50));
  console.log('RESULTS vs GROUND TRUTH');
  console.log('='.repeat(50));

  console.log(`\nHOME (Osseo, White):`);
  console.log(`  Detected: ${homeScore} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.home.score} pts`);
  console.log(`  Diff:     ${homeScore - GROUND_TRUTH.home.score} ${homeScore === GROUND_TRUTH.home.score ? '✅' : '❌'}`);

  console.log(`\nAWAY (Park Center, Green):`);
  console.log(`  Detected: ${awayScore} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.away.score} pts`);
  console.log(`  Diff:     ${awayScore - GROUND_TRUTH.away.score} ${awayScore === GROUND_TRUTH.away.score ? '✅' : '❌'}`);

  console.log(`\nTOTAL:`);
  console.log(`  Detected: ${homeScore + awayScore} pts`);
  console.log(`  Actual:   ${GROUND_TRUTH.total} pts`);
  console.log(`  Diff:     ${(homeScore + awayScore) - GROUND_TRUTH.total} ${(homeScore + awayScore) === GROUND_TRUTH.total ? '✅' : '❌'}`);

  const accuracy = Math.round((1 - Math.abs((homeScore + awayScore) - GROUND_TRUTH.total) / GROUND_TRUTH.total) * 100);
  console.log(`\nAccuracy: ${accuracy}%`);

  console.log('\n=== SHOT LOG ===');
  for (const shot of shots) {
    const r = shot.result === 'made' ? '✓' : '✗';
    console.log(`  ${shot.time} - #${shot.jersey} (${shot.team}) ${shot.type} ${r}`);
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

  // Sort by team then points
  const sorted = [...playerStats.entries()].sort((a, b) => {
    if (a[0].startsWith('home') && !b[0].startsWith('home')) return -1;
    if (!a[0].startsWith('home') && b[0].startsWith('home')) return 1;
    return b[1].points - a[1].points;
  });

  console.log('\nHOME (Osseo, White):');
  for (const [player, stats] of sorted.filter(([k]) => k.startsWith('home'))) {
    console.log(`  ${player.replace('home-', '')}: ${stats.attempts} att, ${stats.makes} made, ${stats.points} pts`);
  }

  console.log('\nAWAY (Park Center, Green):');
  for (const [player, stats] of sorted.filter(([k]) => k.startsWith('away'))) {
    console.log(`  ${player.replace('away-', '')}: ${stats.attempts} att, ${stats.makes} made, ${stats.points} pts`);
  }
}

main().catch(console.error);
