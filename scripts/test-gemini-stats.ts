/**
 * Test script to verify Gemini stat tracking accuracy
 * Usage: GEMINI_API_KEY=xxx npx tsx scripts/test-gemini-stats.ts
 */

const testPrompt = `You are an elite basketball scout analyzing game film.

Analyze this basketball video and track EVERY statistical event.

CRITICAL: For each player, you MUST:
1. Count every SHOT ATTEMPT - whether made or missed
2. When a player SCORES, add to BOTH points AND fieldGoalsMade/fieldGoalsAttempted
3. Example: Player #22 makes a 3-pointer → points +3, fieldGoalsMade +1, fieldGoalsAttempted +1, threePointersMade +1, threePointersAttempted +1
4. Example: Player #10 misses a layup → fieldGoalsAttempted +1 (but NOT fieldGoalsMade)

Return JSON with this EXACT structure:
{
  "playerStats": [
    {
      "jersey": 22,
      "team": "home",
      "position": "SF",
      "boxScore": {
        "points": 10,
        "fieldGoalsMade": 4,
        "fieldGoalsAttempted": 7,
        "threePointersMade": 2,
        "threePointersAttempted": 3,
        "freeThrowsMade": 0,
        "freeThrowsAttempted": 0,
        "rebounds": 3,
        "assists": 1,
        "steals": 0,
        "blocks": 0,
        "turnovers": 1
      },
      "shotLog": [
        { "time": "1:23", "type": "3pt", "result": "made", "description": "Catch and shoot from corner" },
        { "time": "2:45", "type": "layup", "result": "missed", "description": "Contested at rim" }
      ]
    }
  ],
  "validation": {
    "totalPointsScored": 45,
    "totalShotsAttempted": 32,
    "totalShotsMade": 18,
    "mathCheck": "Points should equal 2*(2ptFGmade) + 3*(3ptFGmade) + 1*(FTmade)"
  }
}

IMPORTANT:
- The "shotLog" array helps you track - every entry should correspond to FG stats
- Points MUST mathematically equal: (2pt makes × 2) + (3pt makes × 3) + (FT makes × 1)
- If you see a player score, there MUST be a corresponding fieldGoalsMade entry

Return ONLY valid JSON, no markdown.`;

async function testGeminiStats() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  // For testing, we'll use a YouTube video URL
  // In production this would be the actual game video
  const testVideoUrl = process.argv[2];

  if (!testVideoUrl) {
    console.log('Usage: GEMINI_API_KEY=xxx npx tsx scripts/test-gemini-stats.ts <video-url>');
    console.log('');
    console.log('This will test if Gemini correctly tracks FG stats with improved prompting.');
    console.log('');
    console.log('The key test: Does points = 2*(2ptFG) + 3*(3ptFG) + 1*(FT)?');
    process.exit(0);
  }

  console.log('Testing Gemini stat tracking with improved prompt...');
  console.log('Video:', testVideoUrl);
  console.log('');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const { GoogleAIFileManager } = await import('@google/generative-ai/server');

  const genai = new GoogleGenerativeAI(apiKey);
  const fileManager = new GoogleAIFileManager(apiKey);

  // Handle video - either local file or URL
  console.log('Preparing video...');
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  let tempPath: string;

  if (testVideoUrl.startsWith('http')) {
    // Download from URL
    console.log('Downloading from URL...');
    tempPath = path.join(os.tmpdir(), `test-video-${Date.now()}.mp4`);
    const response = await fetch(testVideoUrl);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    console.log('Downloaded to:', tempPath);
  } else {
    // Local file
    tempPath = testVideoUrl;
    console.log('Using local file:', tempPath);
    if (!fs.existsSync(tempPath)) {
      console.error('File not found:', tempPath);
      process.exit(1);
    }
  }

  // Upload to Gemini
  console.log('Uploading to Gemini...');
  const uploadResult = await fileManager.uploadFile(tempPath, {
    mimeType: 'video/mp4',
    displayName: 'test-video',
  });

  console.log('Upload complete, waiting for processing...');
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 5000));
    file = await fileManager.getFile(uploadResult.file.name);
    console.log('  State:', file.state);
  }

  if (file.state === 'FAILED') {
    console.error('Video processing failed');
    process.exit(1);
  }

  console.log('Video ready, analyzing...');

  // Analyze
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent([
    { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
    { text: testPrompt },
  ]);

  const text = result.response.text();
  console.log('\n=== RAW GEMINI RESPONSE ===');
  console.log(text);

  // Parse and validate
  try {
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0];
    }

    const data = JSON.parse(jsonText.trim());

    console.log('\n=== VALIDATION ===');

    if (data.playerStats) {
      for (const player of data.playerStats) {
        const bs = player.boxScore || {};
        const calculatedPoints =
          ((bs.fieldGoalsMade || 0) - (bs.threePointersMade || 0)) * 2 +
          (bs.threePointersMade || 0) * 3 +
          (bs.freeThrowsMade || 0);

        const reported = bs.points || 0;
        const match = calculatedPoints === reported;

        console.log(`#${player.jersey} (${player.team}):`);
        console.log(`  Points: ${reported}`);
        console.log(`  FG: ${bs.fieldGoalsMade}/${bs.fieldGoalsAttempted}`);
        console.log(`  3P: ${bs.threePointersMade}/${bs.threePointersAttempted}`);
        console.log(`  FT: ${bs.freeThrowsMade}/${bs.freeThrowsAttempted}`);
        console.log(`  Calculated: ${calculatedPoints} (${match ? '✅ MATCH' : '❌ MISMATCH'})`);
        console.log(`  Shot log entries: ${player.shotLog?.length || 0}`);
        console.log('');
      }
    }

    if (data.validation) {
      console.log('Gemini validation:', data.validation);
    }
  } catch (e) {
    console.error('Failed to parse JSON:', e);
  }

  // Cleanup (only if we downloaded)
  if (testVideoUrl.startsWith('http')) {
    fs.unlinkSync(tempPath);
  }
  console.log('\nTest complete.');
}

testGeminiStats().catch(console.error);
