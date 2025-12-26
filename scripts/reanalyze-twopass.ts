/**
 * Two-pass analysis: First count all shots, then do detailed analysis
 * This approach had 6/6 accuracy on the 5-min test clip
 */

import { db } from '../lib/db/drizzle';
import { games, detectedPlays, detectedPlayers, playerAnalysis, keyMoments, detectedTeams, teamAnalysis } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
const CHUNK_DURATION_SECONDS = 15 * 60;
const CHUNK_THRESHOLD_SECONDS = 45 * 60;

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const gameId = process.argv[2];
if (!gameId) {
  console.log('Usage: GEMINI_API_KEY=xxx npx tsx scripts/reanalyze-twopass.ts <game-id>');
  process.exit(0);
}

// PASS 1: Just count shots - simple and focused
const PASS1_PROMPT = `Watch this basketball video TWICE mentally.

FIRST PASS: Identify every moment where the ball goes toward the basket.
SECOND PASS: For each moment, record the details.

Return JSON:
{
  "firstPassCount": number,
  "shots": [
    { "time": "M:SS", "seconds": number, "jersey": number, "team": "home|away", "type": "2pt|3pt|ft", "result": "made|missed", "description": "brief description" }
  ],
  "verification": {
    "totalAttempts": number,
    "matchesFirstPass": boolean
  },
  "scoring": {
    "home": { "points": number, "made2pt": number, "made3pt": number, "madeFt": number },
    "away": { "points": number, "made2pt": number, "made3pt": number, "madeFt": number }
  }
}

IMPORTANT: Count EVERY shot attempt including free throws. Watch for:
- Layups and shots at the rim
- Mid-range jumpers
- 3-pointers
- Free throws (player alone at the line)
- Dunks
- Tip-ins and putbacks
- MISSED shots count as attempts too!`;

// PASS 2: Detailed scouting with shot data as reference
function buildPass2Prompt(shotData: any, sport: string, chunkStartSeconds: number) {
  return `You are a basketball scout. Using the shot data below as reference, provide detailed scouting analysis.

=== VERIFIED SHOT DATA (from pass 1) ===
${JSON.stringify(shotData.shots || [], null, 2)}

Total: ${shotData.verification?.totalAttempts || shotData.shots?.length || 0} attempts
Scoring: Home ${shotData.scoring?.home?.points || 0} - Away ${shotData.scoring?.away?.points || 0}

=== YOUR TASK ===
Using the shot data above as your source of truth for box scores, add:
1. Player scouting reports with skill grades
2. Team analysis
3. Play-by-play details

Return JSON:
{
  "gameInfo": {
    "duration": "MM:SS",
    "teams": {
      "home": { "name": "team name", "jerseyColor": "primary color" },
      "away": { "name": "team name", "jerseyColor": "primary color" }
    }
  },
  "playerScouting": [
    {
      "jersey": number,
      "team": "home|away",
      "estimatedPosition": "PG|SG|SF|PF|C",
      "boxScore": {
        "points": number,
        "fieldGoalsMade": number,
        "fieldGoalsAttempted": number,
        "threePointersMade": number,
        "threePointersAttempted": number,
        "freeThrowsMade": number,
        "freeThrowsAttempted": number,
        "totalRebounds": number,
        "assists": number,
        "steals": number,
        "blocks": number,
        "turnovers": number
      },
      "shotLog": [copy from shot data above],
      "offensiveSkills": { "scoring": { "overall": "A-F" }, "ballHandling": { "overall": "A-F" }, "passing": { "overall": "A-F" } },
      "defensiveSkills": { "onBall": "A-F", "helpDefense": "A-F", "rebounding": "A-F" },
      "scoutingSummary": "2-3 sentence assessment"
    }
  ],
  "teamAnalysis": {
    "home": { "strengths": [], "weaknesses": [], "offensiveTendencies": {}, "defensiveTendencies": {} },
    "away": { "strengths": [], "weaknesses": [], "offensiveTendencies": {}, "defensiveTendencies": {} }
  },
  "plays": [
    {
      "playNumber": number,
      "startTime": "MM:SS",
      "startSeconds": number,
      "teamWithPossession": "home|away",
      "result": { "outcome": "string", "pointsScored": number, "shooter": number },
      "description": "brief description"
    }
  ]
}

CRITICAL: Your box scores MUST match the shot data provided. Calculate from the shots array.`;
}

async function main() {
  console.log('TWO-PASS ANALYSIS');
  console.log('=================');
  console.log('Re-analyzing game:', gameId);

  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) {
    console.error('Game not found');
    process.exit(1);
  }

  console.log('Game:', game.title);

  // Clear existing data
  console.log('\nClearing existing analysis data...');
  await db.delete(detectedPlays).where(eq(detectedPlays.gameId, gameId));
  const existingTeams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  for (const team of existingTeams) {
    await db.delete(teamAnalysis).where(eq(teamAnalysis.detectedTeamId, team.id));
    const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, team.id));
    for (const player of players) {
      await db.delete(keyMoments).where(eq(keyMoments.detectedPlayerId, player.id));
      await db.delete(playerAnalysis).where(eq(playerAnalysis.detectedPlayerId, player.id));
    }
    await db.delete(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, team.id));
  }
  await db.delete(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  console.log('Cleared.');

  // Download/use cached video
  const tempDir = os.tmpdir();
  const videoPath = path.join(tempDir, `game-${gameId}.mp4`);

  if (!fs.existsSync(videoPath)) {
    console.log('\nDownloading video from R2...');
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { pipeline } = await import('stream/promises');

    const r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
      },
    });

    const response = await r2Client.send(new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET || 'aiscoutvideos',
      Key: `games/${gameId}/video.mp4`,
    }));

    await pipeline(response.Body as any, fs.createWriteStream(videoPath));
    console.log('Downloaded.');
  } else {
    console.log('\nUsing cached video.');
  }

  // Get duration
  let duration = 0;
  try {
    const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`, { encoding: 'utf-8' });
    duration = parseFloat(output.trim());
    console.log('Duration:', Math.floor(duration / 60), 'minutes');
  } catch (e) {}

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Use 2.5 Flash for pass 1 (faster, good at counting with twoPass prompt)
  const pass1Model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  // Use 3 Pro for pass 2 (better scouting analysis)
  const pass2Model = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      // @ts-ignore
      thinkingConfig: { thinkingLevel: 'HIGH' },
    },
  });

  // Chunk video
  const numChunks = Math.ceil(duration / CHUNK_DURATION_SECONDS);
  console.log(`\nSplitting into ${numChunks} chunks...`);

  const chunkPaths: string[] = [];
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION_SECONDS;
    const chunkPath = path.join(tempDir, `twopass_chunk_${i}.mp4`);

    if (!fs.existsSync(chunkPath)) {
      execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${CHUNK_DURATION_SECONDS} -c copy "${chunkPath}" 2>/dev/null`);
    }
    chunkPaths.push(chunkPath);
    console.log(`Chunk ${i + 1}/${numChunks} ready`);
  }

  // Upload chunks
  console.log('\nUploading chunks to Gemini...');
  const uploadedFiles = await Promise.all(
    chunkPaths.map(async (chunkPath, i) => {
      const result = await fileManager.uploadFile(chunkPath, {
        mimeType: 'video/mp4',
        displayName: `twopass-chunk-${i + 1}`,
      });
      console.log(`Uploaded chunk ${i + 1}`);
      return result.file;
    })
  );

  // Wait for processing
  console.log('\nWaiting for Gemini to process...');
  const readyFiles = await Promise.all(
    uploadedFiles.map(async (file) => {
      let f = file;
      while (f.state === 'PROCESSING') {
        await new Promise(r => setTimeout(r, 3000));
        f = await fileManager.getFile(f.name);
      }
      console.log(`${f.displayName} ready`);
      return f;
    })
  );

  // PASS 1: Count shots for each chunk
  console.log('\n=== PASS 1: COUNTING SHOTS ===');
  const pass1Results: any[] = [];

  for (let i = 0; i < readyFiles.length; i++) {
    const file = readyFiles[i];
    const chunkStartTime = i * CHUNK_DURATION_SECONDS;

    console.log(`\nPass 1 - Chunk ${i + 1}/${readyFiles.length}...`);
    const startTime = Date.now();

    try {
      const result = await pass1Model.generateContent([
        { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
        { text: PASS1_PROMPT },
      ]);

      const text = result.response.text();
      const parsed = JSON.parse(text);
      parsed._chunkIndex = i;
      parsed._chunkStartTime = chunkStartTime;

      const elapsed = (Date.now() - startTime) / 1000;
      const shotCount = parsed.shots?.length || 0;
      const homeScore = parsed.scoring?.home?.points || 0;
      const awayScore = parsed.scoring?.away?.points || 0;

      console.log(`  Time: ${elapsed.toFixed(1)}s`);
      console.log(`  Shots found: ${shotCount}`);
      console.log(`  Score: Home ${homeScore} - Away ${awayScore}`);

      pass1Results.push(parsed);
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
      pass1Results.push({ shots: [], _chunkIndex: i, _chunkStartTime: chunkStartTime });
    }

    await new Promise(r => setTimeout(r, 2000)); // Rate limit
  }

  // Aggregate pass 1 results
  console.log('\n=== AGGREGATING PASS 1 RESULTS ===');
  const allShots: any[] = [];
  let totalHome = 0;
  let totalAway = 0;

  for (const result of pass1Results) {
    const offset = result._chunkStartTime || 0;
    for (const shot of (result.shots || [])) {
      allShots.push({
        ...shot,
        seconds: (shot.seconds || 0) + offset,
      });
    }
    totalHome += result.scoring?.home?.points || 0;
    totalAway += result.scoring?.away?.points || 0;
  }

  console.log(`Total shots detected: ${allShots.length}`);
  console.log(`PASS 1 SCORE: Home ${totalHome} - Away ${totalAway}`);

  // PASS 2: Detailed analysis with shot data as reference
  console.log('\n=== PASS 2: DETAILED SCOUTING ===');
  const pass2Results: any[] = [];

  for (let i = 0; i < readyFiles.length; i++) {
    const file = readyFiles[i];
    const chunkStartTime = i * CHUNK_DURATION_SECONDS;
    const chunkShotData = pass1Results[i];

    console.log(`\nPass 2 - Chunk ${i + 1}/${readyFiles.length}...`);
    const startTime = Date.now();

    try {
      const prompt = buildPass2Prompt(chunkShotData, 'basketball', chunkStartTime);
      const result = await pass2Model.generateContent([
        { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
        { text: prompt },
      ]);

      const text = result.response.text();
      const parsed = JSON.parse(text);
      parsed._chunkIndex = i;
      parsed._chunkStartTime = chunkStartTime;

      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`  Time: ${elapsed.toFixed(1)}s`);
      console.log(`  Players: ${parsed.playerScouting?.length || 0}`);
      console.log(`  Plays: ${parsed.plays?.length || 0}`);

      pass2Results.push(parsed);
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
      pass2Results.push({ playerScouting: [], plays: [], _chunkIndex: i, _chunkStartTime: chunkStartTime });
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  // Aggregate results
  console.log('\n=== FINAL AGGREGATION ===');

  // Aggregate players
  const playerMap = new Map<string, any>();
  for (const result of pass2Results) {
    for (const player of (result.playerScouting || [])) {
      const key = `${player.team}-${player.jersey}`;
      if (!playerMap.has(key)) {
        playerMap.set(key, { ...player, _appearances: 1 });
      } else {
        const existing = playerMap.get(key);
        // Aggregate box scores
        if (player.boxScore && existing.boxScore) {
          for (const stat of ['points', 'fieldGoalsMade', 'fieldGoalsAttempted', 'threePointersMade', 'threePointersAttempted', 'freeThrowsMade', 'freeThrowsAttempted', 'totalRebounds', 'assists', 'steals', 'blocks', 'turnovers']) {
            existing.boxScore[stat] = (existing.boxScore[stat] || 0) + (player.boxScore[stat] || 0);
          }
        }
        if (player.shotLog) {
          existing.shotLog = [...(existing.shotLog || []), ...player.shotLog];
        }
        existing._appearances++;
      }
    }
  }

  // Aggregate plays
  const allPlays: any[] = [];
  for (const result of pass2Results) {
    const offset = result._chunkStartTime || 0;
    for (const play of (result.plays || [])) {
      allPlays.push({
        ...play,
        playNumber: allPlays.length + 1,
        startSeconds: (play.startSeconds || 0) + offset,
      });
    }
  }

  console.log(`Total players: ${playerMap.size}`);
  console.log(`Total plays: ${allPlays.length}`);

  // Calculate final score
  let homeScore = 0;
  let awayScore = 0;

  for (const player of playerMap.values()) {
    const pts = player.boxScore?.points || 0;
    if (player.team === 'home') {
      homeScore += pts;
    } else {
      awayScore += pts;
    }
  }

  console.log(`\n=== FINAL SCORE ===`);
  console.log(`PASS 1 (shot counting): Home ${totalHome} - Away ${totalAway}`);
  console.log(`PASS 2 (scouting): Home ${homeScore} - Away ${awayScore}`);
  console.log(`\nExpected: Home 74 - Away 55`);

  // Store results
  console.log('\nStoring in database...');

  const analysis = {
    gameInfo: pass2Results[0]?.gameInfo || {},
    playerScouting: Array.from(playerMap.values()),
    plays: allPlays,
    teamAnalysis: pass2Results[0]?.teamAnalysis || {},
    pass1TotalShots: allShots.length,
    pass1Score: { home: totalHome, away: totalAway },
  };

  // Create teams
  let homeTeamId: string | undefined;
  let awayTeamId: string | undefined;

  if (analysis.gameInfo?.teams?.home) {
    const [t] = await db.insert(detectedTeams).values({
      gameId,
      teamLabel: 'home',
      primaryJerseyColor: analysis.gameInfo.teams.home.jerseyColor,
      teamName: analysis.gameInfo.teams.home.name,
    }).returning();
    homeTeamId = t?.id;
  }

  if (analysis.gameInfo?.teams?.away) {
    const [t] = await db.insert(detectedTeams).values({
      gameId,
      teamLabel: 'away',
      primaryJerseyColor: analysis.gameInfo.teams.away.jerseyColor,
      teamName: analysis.gameInfo.teams.away.name,
    }).returning();
    awayTeamId = t?.id;
  }

  // Store plays
  for (const play of analysis.plays) {
    await db.insert(detectedPlays).values({
      gameId,
      startTimestamp: play.startSeconds?.toString() || '0',
      playType: play.result?.outcome || 'unknown',
      rawData: play,
    });
  }
  console.log(`Stored ${analysis.plays.length} plays`);

  // Store players
  for (const player of analysis.playerScouting) {
    const teamId = player.team === 'home' ? homeTeamId : awayTeamId;
    const [inserted] = await db.insert(detectedPlayers).values({
      gameId,
      detectedTeamId: teamId,
      jerseyNumber: player.jersey,
      displayName: `#${player.jersey}`,
      positionGuess: player.estimatedPosition,
    }).returning();

    if (inserted) {
      await db.insert(playerAnalysis).values({
        detectedPlayerId: inserted.id,
        metrics: { boxScore: player.boxScore, shotLog: player.shotLog },
        summary: player.scoutingSummary,
      });
    }
  }
  console.log(`Stored ${analysis.playerScouting.length} players`);

  // Update game
  await db.update(games).set({
    geminiAnalysis: analysis,
    status: 'ready',
    processingProgress: 100,
  }).where(eq(games.id, gameId));

  console.log('\n=== COMPLETE ===');
  console.log(`View at: http://localhost:3000/game/${gameId}`);
}

main().catch(console.error);
