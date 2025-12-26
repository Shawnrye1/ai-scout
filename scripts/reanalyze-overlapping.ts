/**
 * Analysis with overlapping chunks to catch boundary shots
 * Uses 10-minute chunks with 2-minute overlaps
 * Uses Gemini 3 Pro with media_resolution: high for better jersey OCR
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

// Overlapping chunk settings
const CHUNK_DURATION = 10 * 60; // 10 minutes
const OVERLAP_DURATION = 2 * 60; // 2 minute overlap

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const gameId = process.argv[2];
if (!gameId) {
  console.log('Usage: GEMINI_API_KEY=xxx npx tsx scripts/reanalyze-overlapping.ts <game-id>');
  process.exit(0);
}

const PROMPT = `You are a basketball statistician. Your job is to accurately count shot attempts during LIVE GAME PLAY ONLY.

ONLY COUNT SHOTS WHEN:
- The game clock is running (active play)
- After inbound plays (ball is live)
- On fast breaks and transition plays
- Free throws at the line after fouls

DO NOT COUNT:
- Warm-up shots before tip-off
- Shots during timeouts or dead ball situations
- Halftime or pre-game shooting
- Shots after the whistle has blown
- Practice shots between plays

COMMON MISTAKES TO AVOID:
- Missing free throws after fouls (watch for players at the free throw line)
- Missing fast break layups (these happen quickly after turnovers)
- Forgetting to count MISSED shots as attempts
- Missing and-1 plays (made shot + foul = shot attempt + possibly free throws)
- Missing tip-ins and putbacks after offensive rebounds

Count EVERY ball that goes toward the basket during live play, whether it goes in or not.

Return JSON:
{
  "gameInfo": {
    "teams": {
      "home": { "name": "team name", "jerseyColor": "color" },
      "away": { "name": "team name", "jerseyColor": "color" }
    }
  },
  "shots": [
    { "time": "M:SS", "seconds": number, "jersey": number, "team": "home|away", "type": "2pt|3pt|ft", "result": "made|missed", "description": "brief" }
  ],
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
      "shotLog": [{ "time": "M:SS", "seconds": number, "type": "2pt|3pt|ft", "result": "made|missed" }],
      "scoutingSummary": "2-3 sentences"
    }
  ],
  "plays": [
    { "playNumber": number, "startTime": "M:SS", "startSeconds": number, "description": "brief" }
  ]
}`;

async function main() {
  console.log('OVERLAPPING CHUNKS ANALYSIS');
  console.log('===========================');
  console.log('Settings: 10-min chunks with 2-min overlap');
  console.log('Model: Gemini 3 Pro with media_resolution: high');
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
    console.log('Duration:', Math.floor(duration / 60), 'minutes', Math.floor(duration % 60), 'seconds');
  } catch (e) {}

  // Calculate overlapping chunks
  // Stride = CHUNK_DURATION - OVERLAP_DURATION = 10 - 2 = 8 minutes
  const stride = CHUNK_DURATION - OVERLAP_DURATION;
  const numChunks = Math.ceil(duration / stride);
  console.log(`\nCreating ${numChunks} overlapping chunks (${CHUNK_DURATION/60}min each, ${OVERLAP_DURATION/60}min overlap)...`);

  // Create chunks
  const chunkPaths: { path: string; start: number; end: number }[] = [];
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * stride;
    const endTime = Math.min(startTime + CHUNK_DURATION, duration);
    const chunkPath = path.join(tempDir, `overlap_chunk_${i}.mp4`);

    if (!fs.existsSync(chunkPath)) {
      const chunkDuration = endTime - startTime;
      execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${chunkDuration} -c copy "${chunkPath}" 2>/dev/null`);
    }

    chunkPaths.push({ path: chunkPath, start: startTime, end: endTime });
    console.log(`Chunk ${i + 1}: ${Math.floor(startTime/60)}:${(startTime%60).toString().padStart(2,'0')} - ${Math.floor(endTime/60)}:${(endTime%60).toString().padStart(2,'0')}`);
  }

  // Initialize Gemini
  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  const model = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      // @ts-ignore - Gemini 3 settings
      thinkingConfig: { thinkingLevel: 'HIGH' },
      mediaResolution: 'media_resolution_high', // 280 tokens/frame for better jersey OCR
    },
  });

  // Upload chunks with retry logic
  console.log('\nUploading chunks to Gemini...');
  const uploadedFiles: any[] = [];

  async function uploadWithRetry(chunkPath: string, displayName: string, attempt = 1): Promise<any> {
    const maxAttempts = 3;
    try {
      const result = await fileManager.uploadFile(chunkPath, {
        mimeType: 'video/mp4',
        displayName,
      });
      return result.file;
    } catch (e: any) {
      if (attempt < maxAttempts) {
        console.log(`  Upload retry ${attempt}/${maxAttempts - 1}...`);
        await new Promise(r => setTimeout(r, 5000 * attempt));
        return uploadWithRetry(chunkPath, displayName, attempt + 1);
      }
      throw e;
    }
  }

  for (let i = 0; i < chunkPaths.length; i++) {
    const file = await uploadWithRetry(chunkPaths[i].path, `overlap-chunk-${i + 1}`);
    uploadedFiles.push({ ...file, ...chunkPaths[i] });
    console.log(`Uploaded chunk ${i + 1}`);
    await new Promise(r => setTimeout(r, 1000)); // Small delay between uploads
  }

  // Wait for processing
  console.log('\nWaiting for Gemini to process...');
  for (let i = 0; i < uploadedFiles.length; i++) {
    let f = uploadedFiles[i];
    while (f.state === 'PROCESSING') {
      await new Promise(r => setTimeout(r, 3000));
      f = await fileManager.getFile(f.name);
    }
    uploadedFiles[i] = { ...f, start: chunkPaths[i].start, end: chunkPaths[i].end };
    console.log(`Chunk ${i + 1} ready`);
  }

  // Analyze chunks with retry logic
  console.log('\n=== ANALYZING CHUNKS ===');
  const chunkResults: any[] = [];

  async function analyzeChunk(file: any, attempt = 1): Promise<any> {
    const maxAttempts = 3;
    try {
      const result = await model.generateContent([
        { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
        { text: PROMPT },
      ]);

      const text = result.response.text();
      return JSON.parse(text);
    } catch (e: any) {
      if (attempt < maxAttempts) {
        console.log(`    Retry ${attempt}/${maxAttempts - 1} after error: ${e.message}`);
        await new Promise(r => setTimeout(r, 10000 * attempt)); // Exponential backoff
        return analyzeChunk(file, attempt + 1);
      }
      throw e;
    }
  }

  for (let i = 0; i < uploadedFiles.length; i++) {
    const file = uploadedFiles[i];
    console.log(`\nAnalyzing chunk ${i + 1}/${uploadedFiles.length}...`);
    const startTime = Date.now();

    try {
      const parsed = await analyzeChunk(file);
      parsed._chunkStart = file.start;
      parsed._chunkEnd = file.end;

      const elapsed = (Date.now() - startTime) / 1000;
      const shotCount = parsed.shots?.length || 0;
      const playerCount = parsed.playerScouting?.length || 0;

      console.log(`  Time: ${elapsed.toFixed(1)}s`);
      console.log(`  Shots: ${shotCount}, Players: ${playerCount}`);

      chunkResults.push(parsed);

    } catch (e: any) {
      console.log(`  Error (after retries): ${e.message}`);
      chunkResults.push({ shots: [], playerScouting: [], _chunkStart: file.start, _chunkEnd: file.end });
    }

    // Rate limit - wait between chunks
    await new Promise(r => setTimeout(r, 5000));
  }

  // Deduplicate shots from overlapping regions
  console.log('\n=== DEDUPLICATING OVERLAPS ===');
  const allShots: any[] = [];
  const seenShots = new Set<string>();

  // Helper to parse time string "M:SS" to seconds
  function parseTimeToSeconds(time: string): number {
    if (!time) return 0;
    const parts = time.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(parts[0]) || 0;
  }

  for (const result of chunkResults) {
    const chunkStart = result._chunkStart || 0;

    for (const shot of (result.shots || [])) {
      // Use provided seconds, or parse from time string
      const localSeconds = shot.seconds != null ? shot.seconds : parseTimeToSeconds(shot.time);
      const globalSeconds = localSeconds + chunkStart;

      // Create a unique key: timestamp (rounded to 5s window), jersey, type, result
      // 5-second window is more aggressive to catch duplicates from overlaps
      const timeKey = Math.round(globalSeconds / 5) * 5;
      const key = `${timeKey}-${shot.jersey}-${shot.type}-${shot.result}`;

      if (!seenShots.has(key)) {
        seenShots.add(key);
        allShots.push({
          ...shot,
          seconds: globalSeconds,
          _sourceChunk: chunkResults.indexOf(result),
        });
      }
    }
  }

  console.log(`Total shots after dedup: ${allShots.length} (from ${chunkResults.reduce((sum, r) => sum + (r.shots?.length || 0), 0)} raw)`);

  // Aggregate players
  const playerMap = new Map<string, any>();
  for (const result of chunkResults) {
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

  // Recalculate player stats from deduplicated shots
  console.log('\nRecalculating player stats from deduplicated shots...');
  for (const [key, player] of playerMap) {
    const playerShots = allShots.filter(s => s.jersey === player.jersey && s.team === player.team);

    const fgMade = playerShots.filter(s => (s.type === '2pt' || s.type === '3pt') && s.result === 'made').length;
    const fgAttempted = playerShots.filter(s => s.type === '2pt' || s.type === '3pt').length;
    const threePtMade = playerShots.filter(s => s.type === '3pt' && s.result === 'made').length;
    const threePtAttempted = playerShots.filter(s => s.type === '3pt').length;
    const ftMade = playerShots.filter(s => s.type === 'ft' && s.result === 'made').length;
    const ftAttempted = playerShots.filter(s => s.type === 'ft').length;

    const points = ((fgMade - threePtMade) * 2) + (threePtMade * 3) + ftMade;

    player.boxScore = {
      ...player.boxScore,
      points,
      fieldGoalsMade: fgMade,
      fieldGoalsAttempted: fgAttempted,
      threePointersMade: threePtMade,
      threePointersAttempted: threePtAttempted,
      freeThrowsMade: ftMade,
      freeThrowsAttempted: ftAttempted,
    };
    player.shotLog = playerShots;
  }

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
  console.log(`HOME: ${homeScore}`);
  console.log(`AWAY: ${awayScore}`);
  console.log(`TOTAL: ${homeScore + awayScore}`);
  console.log(`\nExpected: HOME 74 - AWAY 55 (Total: 129)`);

  // Store results
  console.log('\nStoring in database...');

  const analysis = {
    gameInfo: chunkResults[0]?.gameInfo || {},
    playerScouting: Array.from(playerMap.values()),
    plays: [],
    shots: allShots,
    chunksUsed: chunkResults.length,
    chunkSettings: { duration: CHUNK_DURATION, overlap: OVERLAP_DURATION },
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
