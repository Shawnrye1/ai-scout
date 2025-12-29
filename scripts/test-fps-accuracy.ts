/**
 * Test different FPS settings for shot detection accuracy
 * Ground truth: 10 attempts, 5 makes, 8 points
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const videoPath = '/Users/shawnearl/ai-scout/test-clip-5min.mp4';

const SHOT_COUNT_PROMPT = `Watch this basketball video TWICE mentally.

FIRST PASS: Count every moment where the ball goes toward the basket.
SECOND PASS: Record details for each shot.

Return JSON:
{
  "firstPassCount": number,
  "shots": [
    { "time": "M:SS", "jersey": number, "type": "2pt|3pt|ft", "result": "made|missed" }
  ],
  "totalAttempts": number,
  "totalMakes": number,
  "totalPoints": number
}

Count EVERY shot including free throws. MISSED shots count as attempts.`;

async function testFPS(fps: number | null, label: string) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing: ${label}`);
  console.log('='.repeat(50));

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const videoBytes = fs.readFileSync(videoPath);
  const videoBase64 = videoBytes.toString('base64');

  const startTime = Date.now();

  try {
    // Build parts with optional FPS
    const parts: any[] = [];

    if (fps !== null) {
      // Use inline data with video_metadata for FPS
      parts.push({
        inlineData: {
          mimeType: 'video/mp4',
          data: videoBase64,
        },
        videoMetadata: { fps },
      });
    } else {
      // Default FPS (1)
      parts.push({
        inlineData: {
          mimeType: 'video/mp4',
          data: videoBase64,
        },
      });
    }

    parts.push({ text: SHOT_COUNT_PROMPT });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const elapsed = (Date.now() - startTime) / 1000;
    const text = response.text || '';
    const parsed = JSON.parse(text);

    const attempts = parsed.totalAttempts || parsed.shots?.length || 0;
    const makes = parsed.totalMakes || parsed.shots?.filter((s: any) => s.result === 'made').length || 0;
    const points = parsed.totalPoints || 0;

    console.log(`Time: ${elapsed.toFixed(1)}s`);
    console.log(`Attempts: ${attempts} (expected: 10) ${attempts === 10 ? '✅' : '❌'}`);
    console.log(`Makes: ${makes} (expected: 5) ${makes === 5 ? '✅' : '❌'}`);
    console.log(`Points: ${points} (expected: 8) ${points === 8 ? '✅' : '❌'}`);

    // Show shots
    if (parsed.shots?.length > 0) {
      console.log('\nShots detected:');
      for (const shot of parsed.shots) {
        const result = shot.result === 'made' ? '✓' : '✗';
        console.log(`  ${shot.time} - #${shot.jersey} ${shot.type} ${result}`);
      }
    }

    return { fps: fps || 1, attempts, makes, points };

  } catch (e: any) {
    console.log(`Error: ${e.message}`);
    if (e.message.includes('extra_forbidden')) {
      console.log('Note: FPS parameter may need different syntax');
    }
    return { fps: fps || 1, attempts: 0, makes: 0, points: 0 };
  }
}

async function main() {
  console.log('Testing FPS Settings for Shot Detection');
  console.log('Ground Truth: 10 attempts, 5 makes, 8 points');
  console.log('========================================\n');

  const videoSize = fs.statSync(videoPath).size / 1024 / 1024;
  console.log(`Video size: ${videoSize.toFixed(1)} MB`);

  if (videoSize > 20) {
    console.log('Warning: Video may be too large for inline data');
  }

  // Test different FPS values
  const results: any[] = [];

  // Default (1 FPS)
  results.push(await testFPS(null, 'Default FPS (1)'));
  await new Promise(r => setTimeout(r, 3000));

  // 2 FPS
  results.push(await testFPS(2, 'FPS = 2'));
  await new Promise(r => setTimeout(r, 3000));

  // 5 FPS
  results.push(await testFPS(5, 'FPS = 5'));
  await new Promise(r => setTimeout(r, 3000));

  // 10 FPS (Google's basketball demo used this)
  results.push(await testFPS(10, 'FPS = 10 (Google demo setting)'));

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  console.log('Ground Truth: 10 attempts, 5 makes, 8 points\n');
  console.log('FPS  | Attempts | Makes | Points | Score');
  console.log('-----|----------|-------|--------|------');

  for (const r of results) {
    const attemptScore = r.attempts === 10 ? 2 : Math.abs(r.attempts - 10) <= 1 ? 1 : 0;
    const makeScore = r.makes === 5 ? 2 : Math.abs(r.makes - 5) <= 1 ? 1 : 0;
    const pointScore = r.points === 8 ? 2 : Math.abs(r.points - 8) <= 1 ? 1 : 0;
    const totalScore = attemptScore + makeScore + pointScore;

    console.log(`${String(r.fps).padEnd(4)} | ${String(r.attempts).padEnd(8)} | ${String(r.makes).padEnd(5)} | ${String(r.points).padEnd(6)} | ${totalScore}/6`);
  }
}

main().catch(console.error);
