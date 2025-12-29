/**
 * Test different Gemini 3 Pro settings for player identification
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const videoPath = '/Users/shawnearl/ai-scout/test-clip-5min.mp4';

const prompt = `Watch this basketball video carefully. List every player jersey number you can see.

Return JSON:
{
  "players": [
    { "jersey": 22, "team": "home_white|away_green" }
  ]
}

Focus on reading the numbers on the jerseys clearly. Home team wears WHITE, away team wears GREEN.`;

async function testConfig(label: string, modelName: string, config: any, file: any, genai: GoogleGenerativeAI) {
  console.log(`\n${label}`);
  console.log('-'.repeat(40));

  try {
    const model = genai.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        ...config,
      },
    });

    const startTime = Date.now();
    const result = await model.generateContent([
      { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
      { text: prompt },
    ]);

    const elapsed = (Date.now() - startTime) / 1000;
    const text = result.response.text();

    const parsed = JSON.parse(text);
    const players = parsed.players || [];

    console.log(`  Time: ${elapsed.toFixed(1)}s`);
    console.log(`  Players found: ${players.length}`);

    if (players.length > 0) {
      const homeJerseys = players.filter((p: any) => p.team?.includes('home') || p.team?.includes('white')).map((p: any) => p.jersey).join(', ');
      const awayJerseys = players.filter((p: any) => p.team?.includes('away') || p.team?.includes('green')).map((p: any) => p.jersey).join(', ');
      console.log(`  Home (white): ${homeJerseys || 'none'}`);
      console.log(`  Away (green): ${awayJerseys || 'none'}`);
    }

    return players.length;
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
    return 0;
  }
}

async function main() {
  console.log('Testing Gemini 3 Pro Settings for Player ID');
  console.log('============================================\n');

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video
  console.log('Uploading clip...');
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: 'test-settings',
  });

  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult.file.name);
  }
  console.log('Upload ready!');

  // Test 1: 2.5 Flash (baseline)
  await testConfig(
    'Baseline: Gemini 2.5 Flash',
    'gemini-2.5-flash',
    {},
    file, genai
  );

  // Test 2: 3 Pro with NO thinking (default)
  await testConfig(
    'Test 1: Gemini 3 Pro (no thinking config)',
    'gemini-3-pro-preview',
    {},
    file, genai
  );

  // Test 3: 3 Pro with thinking: low
  await testConfig(
    'Test 2: Gemini 3 Pro (thinking: low)',
    'gemini-3-pro-preview',
    { thinkingConfig: { thinkingLevel: 'low' } },
    file, genai
  );

  // Test 4: 3 Pro with thinking: high
  await testConfig(
    'Test 3: Gemini 3 Pro (thinking: high)',
    'gemini-3-pro-preview',
    { thinkingConfig: { thinkingLevel: 'high' } },
    file, genai
  );

  // Test 5: 3 Pro with media resolution high
  await testConfig(
    'Test 4: Gemini 3 Pro (mediaResolution: high)',
    'gemini-3-pro-preview',
    { mediaResolution: 'high' },
    file, genai
  );

  // Test 6: 3 Pro with both thinking + media resolution
  await testConfig(
    'Test 5: Gemini 3 Pro (thinking: high + mediaResolution: high)',
    'gemini-3-pro-preview',
    {
      thinkingConfig: { thinkingLevel: 'high' },
      mediaResolution: 'high'
    },
    file, genai
  );

  console.log('\n\nDone!');
}

main().catch(console.error);
