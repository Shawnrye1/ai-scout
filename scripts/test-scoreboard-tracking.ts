/**
 * Scoreboard Tracking Approach
 * Instead of detecting individual shots, track the scoreboard
 * and identify when scores change
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// First half: 0 to 42:33
const CLIP_DURATION = 42 * 60 + 33;
const CLIP_START = 0;

const GROUND_TRUTH = {
  home: { name: 'Osseo Orioles', jerseyColor: 'White', score: 22 },
  away: { name: 'Park Center Pirates', jerseyColor: 'Green', score: 31 },
  total: 53
};

const PROMPT = `You are analyzing a high school basketball game video. Your task is to TRACK THE SCOREBOARD.

CRITICAL INSTRUCTIONS:
1. Look for the on-screen scoreboard/score graphic
2. Track how the score changes throughout the video
3. Note the TIMESTAMP and NEW SCORE each time either team scores
4. The scoreboard shows the official score - this is ground truth

TEAMS:
- HOME: Osseo Orioles (White jerseys)
- AWAY: Park Center Pirates (Green jerseys)

For each scoring event, record:
- The video timestamp when the score changes
- Which team scored (home or away)
- The new score for both teams
- What type of basket (if visible): 2pt, 3pt, or free throw

Return JSON:
{
  "scoreboardVisible": true|false,
  "scoreboardLocation": "description of where scoreboard appears",
  "scoringEvents": [
    {
      "videoTimestamp": "MM:SS",
      "team": "home|away",
      "pointsScored": 1|2|3,
      "newHomeScore": number,
      "newAwayScore": number,
      "description": "brief description of the basket"
    }
  ],
  "finalScore": {
    "home": number,
    "away": number
  },
  "totalScoringEvents": number
}

IMPORTANT:
- Only record events when you SEE the score change on the scoreboard
- If no scoreboard is visible, set scoreboardVisible to false
- Focus on accuracy over completeness - only record what you can verify`;

async function main() {
  console.log('SCOREBOARD TRACKING TEST');
  console.log('========================');
  console.log('Approach: Track scoreboard changes instead of individual shots');
  console.log('');
  console.log('GROUND TRUTH (First Half):');
  console.log(`  HOME (${GROUND_TRUTH.home.name}): ${GROUND_TRUTH.home.score} pts`);
  console.log(`  AWAY (${GROUND_TRUTH.away.name}): ${GROUND_TRUTH.away.score} pts`);
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

  // Use existing clip if available
  if (!fs.existsSync(clipPath)) {
    console.log('Extracting first half clip...');
    execSync(`ffmpeg -y -ss ${CLIP_START} -i "${fullVideoPath}" -t ${CLIP_DURATION} -c copy "${clipPath}" 2>/dev/null`);
  }

  const clipSize = fs.statSync(clipPath).size / (1024 * 1024);
  console.log(`Clip size: ${clipSize.toFixed(1)} MB`);

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Use Gemini 3 Pro for best OCR/scoreboard reading
  const model = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      // @ts-ignore
      thinkingConfig: { thinkingLevel: 'HIGH' },
      mediaResolution: 'media_resolution_high', // Important for reading scoreboard text
    },
  });

  console.log('\nUsing model: gemini-3-pro-preview');

  // Upload
  console.log('\nUploading to Gemini...');
  const startUpload = Date.now();

  let uploadResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      uploadResult = await fileManager.uploadFile(clipPath, {
        mimeType: 'video/mp4',
        displayName: 'scoreboard-tracking-test',
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
  console.log('\nAnalyzing scoreboard...');
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
  console.log('RESULTS');
  console.log('='.repeat(50));

  console.log(`\nScoreboard visible: ${parsed.scoreboardVisible}`);
  if (parsed.scoreboardLocation) {
    console.log(`Scoreboard location: ${parsed.scoreboardLocation}`);
  }

  if (parsed.finalScore) {
    console.log(`\nDetected Final Score: HOME ${parsed.finalScore.home} - AWAY ${parsed.finalScore.away}`);
    console.log(`Actual Final Score:   HOME ${GROUND_TRUTH.home.score} - AWAY ${GROUND_TRUTH.away.score}`);

    const homeAccurate = parsed.finalScore.home === GROUND_TRUTH.home.score;
    const awayAccurate = parsed.finalScore.away === GROUND_TRUTH.away.score;

    console.log(`\nHome accurate: ${homeAccurate ? '✅' : '❌'} (diff: ${parsed.finalScore.home - GROUND_TRUTH.home.score})`);
    console.log(`Away accurate: ${awayAccurate ? '✅' : '❌'} (diff: ${parsed.finalScore.away - GROUND_TRUTH.away.score})`);
  }

  console.log(`\nTotal scoring events detected: ${parsed.totalScoringEvents || parsed.scoringEvents?.length || 0}`);

  if (parsed.scoringEvents && parsed.scoringEvents.length > 0) {
    console.log('\n=== SCORING TIMELINE ===');
    for (const event of parsed.scoringEvents) {
      console.log(`  ${event.videoTimestamp} - ${event.team.toUpperCase()} +${event.pointsScored} → HOME ${event.newHomeScore} - AWAY ${event.newAwayScore} (${event.description || ''})`);
    }

    // Calculate totals from events
    const homeFromEvents = parsed.scoringEvents
      .filter((e: any) => e.team === 'home')
      .reduce((sum: number, e: any) => sum + (e.pointsScored || 0), 0);
    const awayFromEvents = parsed.scoringEvents
      .filter((e: any) => e.team === 'away')
      .reduce((sum: number, e: any) => sum + (e.pointsScored || 0), 0);

    console.log(`\nPoints from events: HOME ${homeFromEvents} - AWAY ${awayFromEvents} (Total: ${homeFromEvents + awayFromEvents})`);
    console.log(`Ground truth:       HOME ${GROUND_TRUTH.home.score} - AWAY ${GROUND_TRUTH.away.score} (Total: ${GROUND_TRUTH.total})`);
  }
}

main().catch(console.error);
