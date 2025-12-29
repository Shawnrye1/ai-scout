/**
 * Compare Gemini models on 5-minute test clip
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const videoPath = '/Users/shawnearl/ai-scout/test-clip-5min.mp4';

const prompt = `Analyze this 5-minute basketball video clip. Track EVERY shot attempt.

Return JSON with this structure:
{
  "shots": [
    { "time": "MM:SS", "player": 22, "team": "home|away", "type": "2pt|3pt|ft", "result": "made|missed", "description": "layup/jumper/etc" }
  ],
  "summary": {
    "totalAttempts": number,
    "totalMakes": number,
    "totalPoints": number
  }
}

Be thorough - count EVERY shot attempt including free throws. Include the timestamp.`;

async function testModel(modelName: string, config: any, file: any, genai: GoogleGenerativeAI) {
  console.log(`\nTesting ${modelName}...`);
  const startTime = Date.now();

  const model = genai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      ...config,
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
    console.log(`  Time: ${elapsed.toFixed(1)}s`);
    console.log(`  Shots found: ${parsed.shots?.length || 0}`);
    console.log(`  Summary: ${parsed.summary?.totalAttempts || 0} attempts, ${parsed.summary?.totalMakes || 0} makes, ${parsed.summary?.totalPoints || 0} pts`);
    console.log(`\n  Shot-by-shot:`);
    for (const shot of (parsed.shots || [])) {
      const result = shot.result === 'made' ? '✓' : '✗';
      console.log(`    ${shot.time} - #${shot.player} ${shot.type} ${result} (${shot.description})`);
    }
    return parsed;
  } catch (e) {
    console.log(`  Parse error: ${e}`);
    console.log(`  Raw: ${text.substring(0, 300)}...`);
    return null;
  }
}

async function main() {
  console.log('Comparing models on 5-minute test clip');
  console.log('=====================================\n');

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video
  console.log('Uploading clip...');
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: 'test-clip-5min',
  });

  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult.file.name);
  }
  console.log('Upload ready!\n');

  // Test both models
  console.log('=== GEMINI 2.5 FLASH ===');
  const flash25 = await testModel('gemini-2.5-flash', {}, file, genai);

  console.log('\n=== GEMINI 3 PRO (thinking: high) ===');
  const pro3 = await testModel('gemini-3-pro-preview', {
    // @ts-ignore
    thinkingConfig: { thinkingLevel: 'high' }
  }, file, genai);

  console.log('\n\n=== GROUND TRUTH (Manual Count) ===');
  console.log('  #10: Missed 3pt, Made 2pt → 2 pts');
  console.log('  #22: Missed 2pt, Missed 2pt → 0 pts');
  console.log('  #1: Made layup → 2 pts');
  console.log('  #24: Made FT → 1 pt');
  console.log('  #25: Made FT → 1 pt');
  console.log('  #11: Missed 3pt, Made 2pt → 2 pts');
  console.log('  TOTAL: 9 attempts, 5 makes, 8 pts');
}

main().catch(console.error);
