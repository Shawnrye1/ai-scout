/**
 * Test media_resolution settings on Gemini 3 Pro
 * Ground truth: 10 attempts, 5 makes, 8 points
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const videoPath = '/Users/shawnearl/ai-scout/test-clip-5min.mp4';

const GROUND_TRUTH = { attempts: 10, makes: 5, points: 8 };

const PROMPT = `You are a basketball statistician. Your job is to NOT MISS any shot attempts.

COMMON MISTAKES TO AVOID:
- Missing free throws after fouls
- Missing fast break layups
- Forgetting to count MISSED shots as attempts
- Missing and-1 plays
- Missing tip-ins and putbacks

Count EVERY ball that goes toward the basket.

Return JSON:
{
  "shots": [
    { "time": "M:SS", "jersey": number, "team": "home|away", "type": "2pt|3pt|ft", "result": "made|missed" }
  ],
  "summary": {
    "totalAttempts": number,
    "totalMakes": number,
    "totalPoints": number
  }
}`;

async function testMediaResolution(resolution: string | null, label: string, genai: any, file: any) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing: ${label}`);
  console.log('='.repeat(50));

  const startTime = Date.now();

  try {
    const config: any = {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: 'HIGH' },
    };

    if (resolution) {
      config.mediaResolution = resolution;
    }

    const model = genai.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      generationConfig: config,
    });

    const result = await model.generateContent([
      { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
      { text: PROMPT },
    ]);

    const elapsed = (Date.now() - startTime) / 1000;
    const text = result.response.text();
    const parsed = JSON.parse(text);

    const shots = parsed.shots || [];
    const attempts = parsed.summary?.totalAttempts || shots.length;
    const makes = parsed.summary?.totalMakes || shots.filter((s: any) => s.result === 'made').length;
    const points = parsed.summary?.totalPoints || 0;

    console.log(`Time: ${elapsed.toFixed(1)}s`);
    console.log(`Attempts: ${attempts} (expected: ${GROUND_TRUTH.attempts}) ${attempts === GROUND_TRUTH.attempts ? '✅' : '❌'}`);
    console.log(`Makes: ${makes} (expected: ${GROUND_TRUTH.makes}) ${makes === GROUND_TRUTH.makes ? '✅' : '❌'}`);
    console.log(`Points: ${points} (expected: ${GROUND_TRUTH.points}) ${points === GROUND_TRUTH.points ? '✅' : '❌'}`);

    // Show jerseys detected
    const jerseys = new Set(shots.map((s: any) => `${s.team}-#${s.jersey}`));
    console.log(`\nJerseys detected: ${Array.from(jerseys).join(', ')}`);

    // Show shots
    console.log('\nShots:');
    for (const shot of shots) {
      const r = shot.result === 'made' ? '✓' : '✗';
      console.log(`  ${shot.time} - #${shot.jersey} (${shot.team}) ${shot.type} ${r}`);
    }

    const score = (attempts === GROUND_TRUTH.attempts ? 2 : 0) + (makes === GROUND_TRUTH.makes ? 2 : 0) + (points === GROUND_TRUTH.points ? 2 : 0);
    return { resolution: resolution || 'default', attempts, makes, points, score, elapsed };

  } catch (e: any) {
    console.log(`Error: ${e.message}`);
    return { resolution: resolution || 'default', attempts: 0, makes: 0, points: 0, score: 0, elapsed: 0 };
  }
}

async function main() {
  console.log('Testing media_resolution Settings');
  console.log('Ground Truth: 10 attempts, 5 makes, 8 points');
  console.log('==================================\n');

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video
  console.log('Uploading test clip...');
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: 'media-res-test',
  });

  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult.file.name);
  }
  console.log('Upload ready!');

  const results: any[] = [];

  // Test default (no media_resolution specified)
  results.push(await testMediaResolution(null, 'Default (no setting)', genai, file));
  await new Promise(r => setTimeout(r, 5000));

  // Test media_resolution_high (280 tokens/frame - best for OCR)
  results.push(await testMediaResolution('media_resolution_high', 'HIGH (280 tokens/frame)', genai, file));
  await new Promise(r => setTimeout(r, 5000));

  // Test media_resolution_low (70 tokens/frame)
  results.push(await testMediaResolution('media_resolution_low', 'LOW (70 tokens/frame)', genai, file));

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  console.log('Ground Truth: 10 attempts, 5 makes, 8 points\n');
  console.log('Resolution    | Attempts | Makes | Points | Score | Time');
  console.log('--------------|----------|-------|--------|-------|------');

  for (const r of results) {
    console.log(`${r.resolution.padEnd(13)} | ${String(r.attempts).padEnd(8)} | ${String(r.makes).padEnd(5)} | ${String(r.points).padEnd(6)} | ${r.score}/6   | ${r.elapsed.toFixed(1)}s`);
  }
}

main().catch(console.error);
