/**
 * Test rebounds and player identification accuracy
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const videoPath = '/Users/shawnearl/ai-scout/test-clip-5min.mp4';

const reboundPrompt = `Analyze this 5-minute basketball video clip. Track EVERY rebound.

Return JSON:
{
  "rebounds": [
    { "time": "MM:SS", "player": 22, "team": "home|away", "type": "offensive|defensive", "description": "context" }
  ],
  "totalRebounds": number
}

Count every rebound - offensive and defensive. Include jersey number and timestamp.`;

const playerPrompt = `Analyze this basketball video. Identify ALL players visible by their jersey numbers.

Return JSON:
{
  "players": [
    { "jersey": 22, "team": "home|away", "jerseyColor": "white|green", "observations": "what you see them do" }
  ]
}

List every unique jersey number you can read clearly. The home team wears white, away team wears green.`;

async function testModel(modelName: string, config: any, file: any, genai: GoogleGenerativeAI, prompt: string, label: string) {
  console.log(`\n${label} - ${modelName}...`);
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
    return parsed;
  } catch (e) {
    console.log(`  Parse error`);
    return null;
  }
}

async function main() {
  console.log('Testing Rebounds and Player Identification');
  console.log('==========================================\n');

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video
  console.log('Uploading clip...');
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: 'test-clip-rebounds',
  });

  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult.file.name);
  }
  console.log('Upload ready!');

  // Test rebounds
  console.log('\n=== REBOUNDS ===');

  const flash25Reb = await testModel('gemini-2.5-flash', {}, file, genai, reboundPrompt, '2.5 Flash');
  if (flash25Reb) {
    console.log(`  Total rebounds: ${flash25Reb.totalRebounds || flash25Reb.rebounds?.length || 0}`);
    for (const r of (flash25Reb.rebounds || []).slice(0, 10)) {
      console.log(`    ${r.time} - #${r.player} ${r.type} (${r.description})`);
    }
  }

  const pro3Reb = await testModel('gemini-3-pro-preview', { thinkingConfig: { thinkingLevel: 'high' } }, file, genai, reboundPrompt, '3 Pro');
  if (pro3Reb) {
    console.log(`  Total rebounds: ${pro3Reb.totalRebounds || pro3Reb.rebounds?.length || 0}`);
    for (const r of (pro3Reb.rebounds || []).slice(0, 10)) {
      console.log(`    ${r.time} - #${r.player} ${r.type} (${r.description})`);
    }
  }

  // Test player identification
  console.log('\n=== PLAYER IDENTIFICATION ===');

  const flash25Players = await testModel('gemini-2.5-flash', {}, file, genai, playerPrompt, '2.5 Flash');
  if (flash25Players) {
    console.log(`  Players found: ${flash25Players.players?.length || 0}`);
    for (const p of (flash25Players.players || [])) {
      console.log(`    #${p.jersey} (${p.team}) - ${p.jerseyColor} - ${p.observations?.substring(0, 50) || ''}`);
    }
  }

  const pro3Players = await testModel('gemini-3-pro-preview', { thinkingConfig: { thinkingLevel: 'high' } }, file, genai, playerPrompt, '3 Pro');
  if (pro3Players) {
    console.log(`  Players found: ${pro3Players.players?.length || 0}`);
    for (const p of (pro3Players.players || [])) {
      console.log(`    #${p.jersey} (${p.team}) - ${p.jerseyColor} - ${p.observations?.substring(0, 50) || ''}`);
    }
  }
}

main().catch(console.error);
