/**
 * Test Options A, B, C to improve accuracy
 * A: Verification Pass - count baskets by jersey color
 * B: Running Score Check - track scoreboard
 * C: White Jersey Emphasis - extra attention to white jerseys
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const GROUND_TRUTH = {
  home: 22, // Osseo, White
  away: 31, // Park Center, Green
  total: 53
};

// Option A: Verification Pass
const PROMPT_A = `Count the TOTAL number of made baskets (ball goes through hoop) by each team.

TEAMS:
- WHITE jerseys = HOME team
- GREEN jerseys = AWAY team

Only count made baskets during live game play. Do not count warmups, timeouts, or halftime.

Return JSON:
{
  "homeBasketCount": number,
  "awayBasketCount": number,
  "estimatedHomePoints": number,
  "estimatedAwayPoints": number,
  "confidence": "high|medium|low"
}`;

// Option B: Running Score Check
const PROMPT_B = `Track the SCOREBOARD throughout this basketball video.

Look for the on-screen score display and track how it changes.

Return JSON:
{
  "scoreboardVisible": true|false,
  "scoreUpdates": [
    { "timestamp": "MM:SS", "homeScore": number, "awayScore": number }
  ],
  "finalScore": {
    "home": number,
    "away": number
  }
}`;

// Option C: White Jersey Emphasis (our best prompt + white emphasis)
const PROMPT_C = `You are a basketball statistician. Your ONLY job is to record MADE BASKETS.

TEAMS:
- HOME: Osseo Orioles wearing WHITE jerseys
- AWAY: Park Center Pirates wearing GREEN jerseys

⚠️ IMPORTANT: WHITE jerseys can be harder to see against the court and lighting.
Pay EXTRA attention to players in WHITE - look carefully at every basket to see if the scorer is wearing WHITE.

WHAT TO RECORD:
1. Made field goals (ball goes through the hoop) - 2 or 3 points
2. Made free throws (ball goes through the hoop from free throw line) - 1 point

WHAT NOT TO RECORD:
- Missed shots, turnovers, fouls, offensive rebounds, warmup shooting

CRITICAL RULES:
1. You must SEE the ball go through the hoop to record it
2. DOUBLE-CHECK the jersey color before assigning the team
3. If the scorer appears to be in a LIGHT colored jersey, they are HOME
4. If the scorer appears to be in a DARK/GREEN colored jersey, they are AWAY

For each MADE basket, record:
- Video timestamp
- Team (home or away)
- Points (1, 2, or 3)
- Jersey number if visible

Return JSON:
{
  "madeBaskets": [
    {
      "timestamp": "MM:SS",
      "team": "home|away",
      "points": 1|2|3,
      "jersey": number|null,
      "jerseyColorObserved": "white|green|other"
    }
  ],
  "summary": {
    "homePoints": number,
    "awayPoints": number,
    "totalPoints": number
  }
}`;

async function testPrompt(label: string, prompt: string, model: any, file: any) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing: ${label}`);
  console.log('='.repeat(50));

  const startTime = Date.now();

  try {
    const result = await model.generateContent([
      { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
      { text: prompt },
    ]);

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`Time: ${elapsed.toFixed(1)}s`);

    const text = result.response.text();
    const parsed = JSON.parse(text);

    return { label, parsed, elapsed };
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
    return { label, parsed: null, error: e.message };
  }
}

async function main() {
  console.log('TESTING OPTIONS A, B, C');
  console.log('========================');
  console.log('Ground Truth (First Half):');
  console.log(`  HOME: ${GROUND_TRUTH.home} pts`);
  console.log(`  AWAY: ${GROUND_TRUTH.away} pts`);
  console.log(`  TOTAL: ${GROUND_TRUTH.total} pts`);

  const tempDir = os.tmpdir();
  const clipPath = path.join(tempDir, 'test-first-half.mp4');

  if (!fs.existsSync(clipPath)) {
    console.error('First half clip not found.');
    process.exit(1);
  }

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

  // Upload video once
  console.log('\nUploading video...');
  const uploadResult = await fileManager.uploadFile(clipPath, {
    mimeType: 'video/mp4',
    displayName: 'options-abc-test',
  });

  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult.file.name);
  }
  console.log('Ready!');

  // Test each option
  const results: any[] = [];

  // Option A
  results.push(await testPrompt('Option A: Verification Count', PROMPT_A, model, file));
  await new Promise(r => setTimeout(r, 5000));

  // Option B
  results.push(await testPrompt('Option B: Scoreboard Tracking', PROMPT_B, model, file));
  await new Promise(r => setTimeout(r, 5000));

  // Option C
  results.push(await testPrompt('Option C: White Jersey Emphasis', PROMPT_C, model, file));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Ground Truth: HOME ${GROUND_TRUTH.home} - AWAY ${GROUND_TRUTH.away} (Total: ${GROUND_TRUTH.total})`);
  console.log('');

  for (const r of results) {
    console.log(`\n${r.label}:`);
    if (r.parsed) {
      // Extract scores based on response format
      let home = 0, away = 0;

      if (r.parsed.summary) {
        home = r.parsed.summary.homePoints || 0;
        away = r.parsed.summary.awayPoints || 0;
      } else if (r.parsed.finalScore) {
        home = r.parsed.finalScore.home || 0;
        away = r.parsed.finalScore.away || 0;
      } else if (r.parsed.estimatedHomePoints !== undefined) {
        home = r.parsed.estimatedHomePoints || 0;
        away = r.parsed.estimatedAwayPoints || 0;
      }

      const total = home + away;
      const homeDiff = home - GROUND_TRUTH.home;
      const awayDiff = away - GROUND_TRUTH.away;
      const totalDiff = total - GROUND_TRUTH.total;
      const accuracy = Math.round((1 - Math.abs(totalDiff) / GROUND_TRUTH.total) * 100);

      console.log(`  HOME: ${home} (${homeDiff >= 0 ? '+' : ''}${homeDiff}) ${home === GROUND_TRUTH.home ? '✅' : '❌'}`);
      console.log(`  AWAY: ${away} (${awayDiff >= 0 ? '+' : ''}${awayDiff}) ${away === GROUND_TRUTH.away ? '✅' : '❌'}`);
      console.log(`  TOTAL: ${total} (${totalDiff >= 0 ? '+' : ''}${totalDiff})`);
      console.log(`  Accuracy: ${accuracy}%`);

      if (r.parsed.confidence) {
        console.log(`  Confidence: ${r.parsed.confidence}`);
      }
      if (r.parsed.scoreboardVisible !== undefined) {
        console.log(`  Scoreboard visible: ${r.parsed.scoreboardVisible}`);
      }
    } else {
      console.log(`  Error: ${r.error}`);
    }
  }

  // Previous baseline for comparison
  console.log('\n--- BASELINE COMPARISON ---');
  console.log('Original made-baskets-only: HOME 21 (-1), AWAY 29 (-2), Total 50 (-3), 94%');
}

main().catch(console.error);
