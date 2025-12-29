/**
 * Test different prompt strategies for shot detection accuracy
 * Ground truth: 9 attempts, 5 makes, 8 points
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const videoPath = '/Users/shawnearl/ai-scout/test-clip-5min.mp4';

// Ground truth from manual count
const GROUND_TRUTH = {
  totalAttempts: 9,
  totalMakes: 5,
  totalPoints: 8,
  shots: [
    { jersey: 10, type: '3pt', result: 'missed' },
    { jersey: 22, type: '2pt', result: 'missed' },
    { jersey: 1, type: '2pt', result: 'made', shotType: 'layup' },
    { jersey: 24, type: 'ft', result: 'made' },
    { jersey: 25, type: 'ft', result: 'made' },
    { jersey: 11, type: '3pt', result: 'missed' },
    { jersey: 22, type: '2pt', result: 'missed' },
    { jersey: 10, type: '2pt', result: 'made' },
    { jersey: 11, type: '2pt', result: 'made' },
  ]
};

// Different prompt strategies to test
const PROMPTS = {
  // Strategy 1: Ultra-simple, just count
  simple: `Count every basketball shot in this video. Include made AND missed shots. Include free throws.

Return JSON:
{
  "shots": [
    { "time": "M:SS", "jersey": number, "type": "2pt|3pt|ft", "result": "made|missed" }
  ],
  "totalAttempts": number,
  "totalMakes": number,
  "totalPoints": number
}

Count EVERY shot. Don't miss any.`,

  // Strategy 2: Running score approach
  runningScore: `Watch this basketball video and track the score as it changes.

Every time a shot is attempted, log it. Every time points are scored, update the running score.

Return JSON:
{
  "scoreLog": [
    { "time": "M:SS", "event": "shot attempt|made basket|free throw", "jersey": number, "type": "2pt|3pt|ft", "result": "made|missed", "runningScore": { "home": number, "away": number } }
  ],
  "finalScore": { "home": number, "away": number },
  "totalShots": number
}

Track the score carefully - it should increase by 2 for made 2-pointers, 3 for made 3-pointers, 1 for made free throws.`,

  // Strategy 3: Frame-by-frame instruction
  frameByFrame: `Analyze this basketball video FRAME BY FRAME for shot attempts.

CRITICAL INSTRUCTIONS:
1. Pause mentally at each second of the video
2. Look for ANY ball movement toward the basket
3. A shot attempt is when the ball leaves a player's hands toward the hoop
4. Include ALL shots: layups, dunks, jumpers, 3-pointers, free throws
5. Include MISSED shots - they count as attempts too
6. Watch for free throws especially - these happen after fouls

Return JSON:
{
  "shots": [
    { "timeSeconds": number, "time": "M:SS", "jersey": number, "team": "home|away", "type": "2pt|3pt|ft", "result": "made|missed", "description": "what happened" }
  ],
  "summary": {
    "totalAttempts": number,
    "totalMakes": number,
    "total2ptAttempts": number,
    "total3ptAttempts": number,
    "totalFtAttempts": number,
    "totalPoints": number
  }
}

Be thorough - missing a shot is worse than over-counting.`,

  // Strategy 4: Explicit checklist
  checklist: `You are a basketball statistician. Watch this video and complete this checklist:

SHOT DETECTION CHECKLIST:
□ Watch for layups and shots at the rim
□ Watch for mid-range jumpers (inside the 3-point line)
□ Watch for 3-point shots (beyond the arc)
□ Watch for free throws (player alone at the line, everyone else lined up)
□ Watch for dunks
□ Watch for tip-ins and putbacks
□ Count MISSED shots too - they're attempts

For EACH shot you see:
- Note the timestamp
- Identify the shooter by jersey number
- Classify as 2pt, 3pt, or ft
- Record if made or missed

Return JSON:
{
  "shots": [
    { "time": "M:SS", "jersey": number, "type": "2pt|3pt|ft", "result": "made|missed", "shotType": "layup|jumper|3-pointer|free throw|dunk" }
  ],
  "totals": {
    "attempts": number,
    "makes": number,
    "points": number,
    "breakdown": {
      "2pt": { "made": number, "missed": number },
      "3pt": { "made": number, "missed": number },
      "ft": { "made": number, "missed": number }
    }
  }
}`,

  // Strategy 5: Negative instruction (tell it what NOT to miss)
  negative: `Watch this basketball video. Your job is to NOT MISS any shot attempts.

COMMON MISTAKES TO AVOID:
- Missing free throws (watch for the foul, then the FT attempts)
- Missing fast break layups (these happen quickly)
- Forgetting to count missed shots as attempts
- Skipping and-1 plays (made shot + foul = shot attempt + possibly FT)
- Missing putbacks after offensive rebounds

Count EVERY ball that goes toward the basket, whether it goes in or not.

Return JSON:
{
  "shots": [
    { "time": "M:SS", "jersey": number, "type": "2pt|3pt|ft", "result": "made|missed" }
  ],
  "stats": {
    "totalAttempts": number,
    "totalMakes": number,
    "totalMisses": number,
    "totalPoints": number,
    "freeThrowAttempts": number
  }
}`,

  // Strategy 6: Two-pass simulation in one prompt
  twoPass: `Watch this basketball video TWICE mentally.

FIRST PASS: Identify every moment where the ball goes toward the basket.
SECOND PASS: For each moment, record the details.

Return JSON:
{
  "firstPassCount": number,
  "shots": [
    { "time": "M:SS", "jersey": number, "type": "2pt|3pt|ft", "result": "made|missed", "description": "brief description" }
  ],
  "verification": {
    "totalAttempts": number,
    "matchesFirstPass": boolean
  },
  "totalPoints": number
}`,
};

async function testPrompt(
  name: string,
  prompt: string,
  model: any,
  file: any
): Promise<{ attempts: number; makes: number; points: number; shots: any[] }> {
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

    // Extract stats from various response formats
    const shots = parsed.shots || parsed.scoreLog || [];
    const attempts = parsed.totalAttempts || parsed.totals?.attempts || parsed.stats?.totalAttempts || parsed.summary?.totalAttempts || shots.length;
    const makes = parsed.totalMakes || parsed.totals?.makes || parsed.stats?.totalMakes || parsed.summary?.totalMakes || shots.filter((s: any) => s.result === 'made').length;
    const points = parsed.totalPoints || parsed.totals?.points || parsed.stats?.totalPoints || parsed.summary?.totalPoints || 0;

    console.log(`Time: ${elapsed.toFixed(1)}s`);
    console.log(`Attempts: ${attempts} (expected: ${GROUND_TRUTH.totalAttempts})`);
    console.log(`Makes: ${makes} (expected: ${GROUND_TRUTH.totalMakes})`);
    console.log(`Points: ${points} (expected: ${GROUND_TRUTH.totalPoints})`);

    // Score accuracy
    const attemptAccuracy = attempts === GROUND_TRUTH.totalAttempts ? '✅' : (Math.abs(attempts - GROUND_TRUTH.totalAttempts) <= 1 ? '⚠️' : '❌');
    const makeAccuracy = makes === GROUND_TRUTH.totalMakes ? '✅' : (Math.abs(makes - GROUND_TRUTH.totalMakes) <= 1 ? '⚠️' : '❌');
    const pointAccuracy = points === GROUND_TRUTH.totalPoints ? '✅' : (Math.abs(points - GROUND_TRUTH.totalPoints) <= 1 ? '⚠️' : '❌');

    console.log(`\nAccuracy: Attempts ${attemptAccuracy}  Makes ${makeAccuracy}  Points ${pointAccuracy}`);

    // Show shots detected
    if (shots.length > 0) {
      console.log('\nShots detected:');
      for (const shot of shots) {
        const time = shot.time || shot.timeSeconds || '?';
        const jersey = shot.jersey || '?';
        const type = shot.type || '?';
        const result = shot.result === 'made' ? '✓' : '✗';
        console.log(`  ${time} - #${jersey} ${type} ${result}`);
      }
    }

    return { attempts, makes, points, shots };

  } catch (e: any) {
    console.log(`Error: ${e.message}`);
    return { attempts: 0, makes: 0, points: 0, shots: [] };
  }
}

async function main() {
  console.log('Testing Prompt Variations for Shot Detection');
  console.log('Ground Truth: 9 attempts, 5 makes, 8 points');
  console.log('============================================\n');

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video once
  console.log('Uploading test clip...');
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: 'prompt-test',
  });

  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult.file.name);
  }
  console.log('Upload ready!');

  // Test with Gemini 2.5 Flash first (faster)
  const model25Flash = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  // Test with Gemini 3 Pro (thinking: HIGH)
  const model3Pro = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      // @ts-ignore
      thinkingConfig: { thinkingLevel: 'HIGH' },
    },
  });

  const results: any[] = [];

  // Test each prompt with 2.5 Flash
  console.log('\n\n========== GEMINI 2.5 FLASH ==========');
  for (const [name, prompt] of Object.entries(PROMPTS)) {
    const result = await testPrompt(`2.5 Flash - ${name}`, prompt, model25Flash, file);
    results.push({ model: '2.5 Flash', prompt: name, ...result });
    await new Promise(r => setTimeout(r, 2000)); // Rate limit
  }

  // Test best prompts with 3 Pro
  console.log('\n\n========== GEMINI 3 PRO (thinking: HIGH) ==========');
  for (const name of ['frameByFrame', 'checklist', 'negative']) {
    const result = await testPrompt(`3 Pro - ${name}`, PROMPTS[name as keyof typeof PROMPTS], model3Pro, file);
    results.push({ model: '3 Pro', prompt: name, ...result });
    await new Promise(r => setTimeout(r, 2000));
  }

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  console.log('Ground Truth: 9 attempts, 5 makes, 8 points\n');
  console.log('Model          | Prompt        | Attempts | Makes | Points | Score');
  console.log('---------------|---------------|----------|-------|--------|------');

  for (const r of results) {
    const attemptScore = r.attempts === 9 ? 2 : Math.abs(r.attempts - 9) <= 1 ? 1 : 0;
    const makeScore = r.makes === 5 ? 2 : Math.abs(r.makes - 5) <= 1 ? 1 : 0;
    const pointScore = r.points === 8 ? 2 : Math.abs(r.points - 8) <= 1 ? 1 : 0;
    const totalScore = attemptScore + makeScore + pointScore;

    console.log(
      `${r.model.padEnd(14)} | ${r.prompt.padEnd(13)} | ${String(r.attempts).padEnd(8)} | ${String(r.makes).padEnd(5)} | ${String(r.points).padEnd(6)} | ${totalScore}/6`
    );
  }

  // Find best
  const best = results.reduce((a, b) => {
    const aScore = (a.attempts === 9 ? 2 : 0) + (a.makes === 5 ? 2 : 0) + (a.points === 8 ? 2 : 0);
    const bScore = (b.attempts === 9 ? 2 : 0) + (b.makes === 5 ? 2 : 0) + (b.points === 8 ? 2 : 0);
    return bScore > aScore ? b : a;
  });

  console.log(`\nBest performer: ${best.model} - ${best.prompt}`);
}

main().catch(console.error);
