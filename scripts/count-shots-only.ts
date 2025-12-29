/**
 * Phase 1: Just count shots - simplified prompt for better accuracy
 * Usage: GEMINI_API_KEY=xxx npx tsx scripts/count-shots-only.ts <video-path>
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const videoPath = process.argv[2];

if (!videoPath) {
  console.log('Usage: GEMINI_API_KEY=xxx npx tsx scripts/count-shots-only.ts <video-path>');
  process.exit(0);
}

// Focused shot-counting prompt - no scouting, just counting
const SHOT_COUNT_PROMPT = `You are a basketball statistician. Your ONLY job is to count EVERY shot attempt in this video.

Watch the video carefully and track EVERY time the ball is shot at the basket:
- 2-point field goals (layups, dunks, mid-range jumpers)
- 3-point field goals (any shot beyond the arc)
- Free throws (shots from the free throw line after a foul)

For each shot, record:
- The time it occurred (MM:SS from video start)
- Which team (by jersey color)
- The shooter's jersey number
- Whether it was made or missed
- The shot type (2pt, 3pt, ft)

Return JSON:
{
  "totalShots": number,
  "shots": [
    {
      "time": "MM:SS",
      "seconds": number,
      "jersey": number,
      "team": "home|away",
      "type": "2pt|3pt|ft",
      "result": "made|missed",
      "description": "brief description"
    }
  ],
  "summary": {
    "home": { "made2pt": number, "missed2pt": number, "made3pt": number, "missed3pt": number, "madeFt": number, "missedFt": number },
    "away": { "made2pt": number, "missed2pt": number, "made3pt": number, "missed3pt": number, "madeFt": number, "missedFt": number }
  },
  "calculatedScore": {
    "home": number,
    "away": number
  }
}

IMPORTANT:
- Count EVERY shot, even contested ones that barely touch the rim
- Include all free throws - watch for fouls and the subsequent free throw attempts
- Double-check your count: totalShots should equal the length of the shots array
- calculatedScore should equal: (made2pt × 2) + (made3pt × 3) + madeFt for each team`;

async function main() {
  console.log('Shot Counter - Phase 1');
  console.log('======================\n');
  console.log('Video:', videoPath);

  if (!fs.existsSync(videoPath)) {
    console.error('Video file not found');
    process.exit(1);
  }

  // Get duration
  let duration = 0;
  try {
    const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`, { encoding: 'utf-8' });
    duration = parseFloat(output.trim());
    console.log('Duration:', Math.floor(duration / 60), 'minutes', Math.floor(duration % 60), 'seconds\n');
  } catch (e) {
    console.log('Could not get duration\n');
  }

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video
  console.log('Uploading to Gemini...');
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: 'shot-count-video',
  });

  let file = uploadResult.file;
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(file.name);
  }
  console.log('Video ready!\n');

  // Try different models and settings
  const configs = [
    { name: 'Gemini 2.5 Flash (baseline)', model: 'gemini-2.5-flash', config: {} },
    { name: 'Gemini 3 Pro (thinking: HIGH)', model: 'gemini-3-pro-preview', config: { thinkingConfig: { thinkingLevel: 'HIGH' } } },
    { name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro', config: {} },
  ];

  for (const cfg of configs) {
    console.log(`\n=== ${cfg.name} ===`);
    const startTime = Date.now();

    try {
      const model = genai.getGenerativeModel({
        model: cfg.model,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 1.0,
          ...cfg.config,
        },
      });

      const result = await model.generateContent([
        { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
        { text: SHOT_COUNT_PROMPT },
      ]);

      const elapsed = (Date.now() - startTime) / 1000;
      const text = result.response.text();
      const parsed = JSON.parse(text);

      console.log(`Time: ${elapsed.toFixed(1)}s`);
      console.log(`Total shots counted: ${parsed.totalShots || parsed.shots?.length || 0}`);
      console.log(`Shots array length: ${parsed.shots?.length || 0}`);

      if (parsed.summary) {
        const home = parsed.summary.home || {};
        const away = parsed.summary.away || {};
        const homePts = (home.made2pt || 0) * 2 + (home.made3pt || 0) * 3 + (home.madeFt || 0);
        const awayPts = (away.made2pt || 0) * 2 + (away.made3pt || 0) * 3 + (away.madeFt || 0);

        console.log(`\nHome: ${home.made2pt || 0} 2pt, ${home.made3pt || 0} 3pt, ${home.madeFt || 0} FT = ${homePts} pts`);
        console.log(`      (${home.missed2pt || 0} missed 2pt, ${home.missed3pt || 0} missed 3pt, ${home.missedFt || 0} missed FT)`);
        console.log(`Away: ${away.made2pt || 0} 2pt, ${away.made3pt || 0} 3pt, ${away.madeFt || 0} FT = ${awayPts} pts`);
        console.log(`      (${away.missed2pt || 0} missed 2pt, ${away.missed3pt || 0} missed 3pt, ${away.missedFt || 0} missed FT)`);
        console.log(`\nCALCULATED SCORE: HOME ${homePts} - AWAY ${awayPts}`);
      }

      if (parsed.calculatedScore) {
        console.log(`MODEL'S SCORE: HOME ${parsed.calculatedScore.home} - AWAY ${parsed.calculatedScore.away}`);
      }

      // Show sample of shots
      if (parsed.shots && parsed.shots.length > 0) {
        console.log('\nFirst 10 shots:');
        for (const shot of parsed.shots.slice(0, 10)) {
          const result = shot.result === 'made' ? '✓' : '✗';
          console.log(`  ${shot.time} - #${shot.jersey} (${shot.team}) ${shot.type} ${result}`);
        }
        if (parsed.shots.length > 10) {
          console.log(`  ... and ${parsed.shots.length - 10} more`);
        }
      }

    } catch (e: any) {
      console.log(`Error: ${e.message}`);
    }
  }

  console.log('\n\nExpected score: HOME 74 - AWAY 55');
  console.log('If none of these match, the video may need manual review or hybrid CV approach.');
}

main().catch(console.error);
