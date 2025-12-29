/**
 * Head-to-head comparison: Gemini 3 Pro vs Two-Pass approach
 * Test on 5-min clip (ground truth: 10 attempts, 5 makes, 8 points)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const videoPath = '/Users/shawnearl/ai-scout/test-clip-5min.mp4';

const GROUND_TRUTH = { attempts: 10, makes: 5, points: 8 };

// Gemini 3 Pro prompt (negative style - worked best)
const GEMINI3_PROMPT = `You are a basketball statistician. Your job is to NOT MISS any shot attempts.

COMMON MISTAKES TO AVOID:
- Missing free throws after fouls (watch for players at the free throw line)
- Missing fast break layups (these happen quickly after turnovers)
- Forgetting to count MISSED shots as attempts
- Missing and-1 plays (made shot + foul = shot attempt + possibly free throws)
- Missing tip-ins and putbacks after offensive rebounds

Count EVERY ball that goes toward the basket, whether it goes in or not.

Return JSON:
{
  "shots": [
    { "time": "M:SS", "seconds": number, "jersey": number, "team": "home|away", "type": "2pt|3pt|ft", "result": "made|missed", "description": "brief" }
  ],
  "summary": {
    "totalAttempts": number,
    "totalMakes": number,
    "totalPoints": number
  }
}`;

// Two-pass prompt (worked perfectly on 5-min clip)
const TWOPASS_PROMPT = `Watch this basketball video TWICE mentally.

FIRST PASS: Count every moment where the ball goes toward the basket.
SECOND PASS: Record details for each shot.

Return JSON:
{
  "firstPassCount": number,
  "shots": [
    { "time": "M:SS", "jersey": number, "type": "2pt|3pt|ft", "result": "made|missed" }
  ],
  "verification": {
    "totalAttempts": number,
    "matchesFirstPass": boolean
  },
  "totalPoints": number
}

Count EVERY shot including free throws. MISSED shots count as attempts.`;

async function runTest(name: string, model: any, prompt: string, file: any) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing: ${name}`);
  console.log('='.repeat(50));

  const startTime = Date.now();

  try {
    const result = await model.generateContent([
      { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
      { text: prompt },
    ]);

    const elapsed = (Date.now() - startTime) / 1000;
    const text = result.response.text();
    const parsed = JSON.parse(text);

    const shots = parsed.shots || [];
    const attempts = parsed.summary?.totalAttempts || parsed.verification?.totalAttempts || shots.length;
    const makes = parsed.summary?.totalMakes || shots.filter((s: any) => s.result === 'made').length;
    const points = parsed.summary?.totalPoints || parsed.totalPoints || 0;

    const attemptOk = attempts === GROUND_TRUTH.attempts;
    const makeOk = makes === GROUND_TRUTH.makes;
    const pointOk = points === GROUND_TRUTH.points;

    console.log(`Time: ${elapsed.toFixed(1)}s`);
    console.log(`Attempts: ${attempts} (expected: ${GROUND_TRUTH.attempts}) ${attemptOk ? '✅' : '❌'}`);
    console.log(`Makes: ${makes} (expected: ${GROUND_TRUTH.makes}) ${makeOk ? '✅' : '❌'}`);
    console.log(`Points: ${points} (expected: ${GROUND_TRUTH.points}) ${pointOk ? '✅' : '❌'}`);

    const score = (attemptOk ? 2 : 0) + (makeOk ? 2 : 0) + (pointOk ? 2 : 0);
    console.log(`\nScore: ${score}/6 ${score === 6 ? '🏆 PERFECT!' : ''}`);

    // Show shots
    console.log('\nShots detected:');
    for (const shot of shots.slice(0, 15)) {
      const r = shot.result === 'made' ? '✓' : '✗';
      console.log(`  ${shot.time || '?'} - #${shot.jersey || '?'} ${shot.type} ${r}`);
    }
    if (shots.length > 15) console.log(`  ... and ${shots.length - 15} more`);

    return { name, attempts, makes, points, score, elapsed };

  } catch (e: any) {
    console.log(`Error: ${e.message}`);
    return { name, attempts: 0, makes: 0, points: 0, score: 0, elapsed: 0 };
  }
}

async function main() {
  console.log('HEAD-TO-HEAD: Gemini 3 Pro vs Two-Pass');
  console.log('Ground Truth: 10 attempts, 5 makes, 8 points');
  console.log('==========================================\n');

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video
  console.log('Uploading test clip...');
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: 'head-to-head-test',
  });

  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult.file.name);
  }
  console.log('Upload ready!');

  const results: any[] = [];

  // Test 1: Gemini 3 Pro with thinking HIGH + negative prompt
  const model3Pro = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      // @ts-ignore
      thinkingConfig: { thinkingLevel: 'HIGH' },
    },
  });
  results.push(await runTest('Gemini 3 Pro (thinking: HIGH, negative prompt)', model3Pro, GEMINI3_PROMPT, file));
  await new Promise(r => setTimeout(r, 3000));

  // Test 2: Gemini 2.5 Flash with twoPass prompt
  const model25Flash = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  results.push(await runTest('Gemini 2.5 Flash (twoPass prompt)', model25Flash, TWOPASS_PROMPT, file));
  await new Promise(r => setTimeout(r, 3000));

  // Test 3: Gemini 3 Pro with twoPass prompt (combine best of both?)
  results.push(await runTest('Gemini 3 Pro (thinking: HIGH, twoPass prompt)', model3Pro, TWOPASS_PROMPT, file));
  await new Promise(r => setTimeout(r, 3000));

  // Test 4: Gemini 2.5 Pro
  const model25Pro = genai.getGenerativeModel({
    model: 'gemini-2.5-pro',
    generationConfig: { responseMimeType: 'application/json' },
  });
  results.push(await runTest('Gemini 2.5 Pro (twoPass prompt)', model25Pro, TWOPASS_PROMPT, file));

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('FINAL RESULTS');
  console.log('='.repeat(60));
  console.log('Ground Truth: 10 attempts, 5 makes, 8 points\n');
  console.log('Model/Config                                    | Att | Mks | Pts | Score');
  console.log('-----------------------------------------------|-----|-----|-----|------');

  for (const r of results) {
    const name = r.name.substring(0, 46).padEnd(46);
    console.log(`${name} | ${String(r.attempts).padEnd(3)} | ${String(r.makes).padEnd(3)} | ${String(r.points).padEnd(3)} | ${r.score}/6`);
  }

  const best = results.reduce((a, b) => b.score > a.score ? b : a);
  console.log(`\n🏆 BEST: ${best.name} (${best.score}/6)`);
}

main().catch(console.error);
