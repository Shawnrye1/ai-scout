/**
 * Test script to compare Gemini models for stat tracking
 * Usage: GEMINI_API_KEY=xxx npx tsx scripts/test-gemini-models.ts <video-path>
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const videoPath = process.argv[2];
if (!videoPath) {
  console.log('Usage: GEMINI_API_KEY=xxx npx tsx scripts/test-gemini-models.ts <video-path>');
  process.exit(0);
}

const prompt = `You are analyzing a basketball game video.

Track EVERY shot attempt by EVERY player. Return JSON with this structure:

{
  "players": [
    {
      "jersey": 22,
      "team": "home",
      "shotLog": [
        { "time": "1:23", "seconds": 83, "type": "3pt", "result": "made" },
        { "time": "2:45", "seconds": 165, "type": "2pt", "result": "missed" }
      ],
      "points": 3,
      "fieldGoalsMade": 1,
      "fieldGoalsAttempted": 2,
      "threePointersMade": 1,
      "threePointersAttempted": 1
    }
  ],
  "plays": [
    { "number": 1, "startSeconds": 0, "endSeconds": 15, "result": "made 3pt by #22" }
  ]
}

CRITICAL VALIDATION:
- points MUST equal (FGM - 3PM) * 2 + 3PM * 3
- shotLog.length MUST equal fieldGoalsAttempted
- Count every shot attempt you see`;

async function testModel(modelName: string, file: any, genai: GoogleGenerativeAI): Promise<any> {
  console.log(`\nTesting ${modelName}...`);
  const startTime = Date.now();

  const model = genai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent([
    { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
    { text: prompt },
  ]);

  const elapsed = (Date.now() - startTime) / 1000;
  const text = result.response.text();

  try {
    const parsed = JSON.parse(text);
    const players = parsed.players || [];
    const plays = parsed.plays || [];

    console.log(`  Time: ${elapsed.toFixed(1)}s`);
    console.log(`  Players: ${players.length}`);
    console.log(`  Plays: ${plays.length}`);

    // Validate stats
    let allValid = true;
    for (const player of players) {
      const shotLogCount = player.shotLog?.length || 0;
      const fga = player.fieldGoalsAttempted || 0;
      const fgm = player.fieldGoalsMade || 0;
      const three = player.threePointersMade || 0;
      const pts = player.points || 0;
      const expectedPts = (fgm - three) * 2 + three * 3;

      if (pts !== expectedPts || shotLogCount !== fga) {
        console.log(`  ❌ #${player.jersey} (${player.team}): pts=${pts} (expected ${expectedPts}), shotLog=${shotLogCount} vs FGA=${fga}`);
        allValid = false;
      } else {
        console.log(`  ✅ #${player.jersey} (${player.team}): pts=${pts}, FG=${fgm}/${fga}, 3P=${three}`);
      }
    }

    return { modelName, elapsed, players: players.length, plays: plays.length, valid: allValid };
  } catch (e) {
    console.log(`  ❌ JSON parse error: ${e}`);
    console.log(`  Raw: ${text.substring(0, 200)}...`);
    return { modelName, elapsed, error: 'JSON parse failed' };
  }
}

async function main() {
  console.log('Comparing Gemini models for basketball stat tracking');
  console.log('Video:', videoPath);

  if (!fs.existsSync(videoPath)) {
    console.error('File not found:', videoPath);
    process.exit(1);
  }

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video
  console.log('\nUploading video to Gemini...');
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: 'test-video',
  });

  console.log('Waiting for processing...');
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult.file.name);
    console.log('  State:', file.state);
  }

  if (file.state === 'FAILED') {
    console.error('Video processing failed');
    process.exit(1);
  }

  console.log('Video ready!');

  // Test models (latest first)
  const models = [
    'gemini-3-pro-preview',       // Gemini 3 Pro with video support
    'gemini-2.5-flash',           // Gemini 2.5 Flash
  ];

  const results: any[] = [];

  for (const modelName of models) {
    try {
      const result = await testModel(modelName, file, genai);
      results.push(result);
    } catch (e: any) {
      console.log(`  ❌ Error: ${e.message}`);
      results.push({ modelName, error: e.message });
    }
  }

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    if (r.error) {
      console.log(`${r.modelName}: ERROR - ${r.error}`);
    } else {
      console.log(`${r.modelName}: ${r.elapsed.toFixed(1)}s, ${r.players} players, ${r.plays} plays, valid=${r.valid}`);
    }
  }
}

main().catch(console.error);
