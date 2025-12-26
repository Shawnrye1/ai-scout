/**
 * Script to re-analyze a game with the improved Gemini prompt
 * Usage: GEMINI_API_KEY=xxx npx tsx scripts/reanalyze-game.ts <game-id>
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

// Chunking settings (same as API route)
const CHUNK_DURATION_SECONDS = 15 * 60; // 15 minutes
const CHUNK_THRESHOLD_SECONDS = 45 * 60; // 45 minutes

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const gameId = process.argv[2];
if (!gameId) {
  console.log('Usage: GEMINI_API_KEY=xxx npx tsx scripts/reanalyze-game.ts <game-id>');
  process.exit(0);
}

async function main() {
  console.log('Re-analyzing game:', gameId);

  // Get game info
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) {
    console.error('Game not found');
    process.exit(1);
  }

  console.log('Game:', game.title);
  console.log('Video URL:', game.videoUrl);

  if (!game.videoUrl) {
    console.error('No video URL found');
    process.exit(1);
  }

  // Clear existing analysis data
  console.log('\nClearing existing analysis data...');

  // Delete plays first (has FK to detected_teams)
  await db.delete(detectedPlays).where(eq(detectedPlays.gameId, gameId));

  // Get existing detected teams and players to delete related data
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

  // Update game status
  await db.update(games).set({
    status: 'analyzing',
    processingProgress: 10,
  }).where(eq(games.id, gameId));

  console.log('Cleared. Starting fresh analysis...\n');

  // Download video from R2 (or use cached)
  const tempDir = os.tmpdir();
  const videoPath = path.join(tempDir, `game-${gameId}.mp4`);

  // Check if video already exists (cached from previous run)
  if (fs.existsSync(videoPath)) {
    const stats = fs.statSync(videoPath);
    if (stats.size > 100 * 1024 * 1024) { // > 100MB means it's likely complete
      console.log('Using cached video:', videoPath);
      console.log('Size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    } else {
      console.log('Cached video incomplete, re-downloading...');
      fs.unlinkSync(videoPath);
    }
  }

  if (!fs.existsSync(videoPath)) {
    console.log('Downloading video from R2...');
    try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { pipeline } = await import('stream/promises');

    const r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || 'https://70fdd2b296312d5e6b02b267a8409d59.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
      },
    });

    // Extract the key from the video URL
    const videoKey = `games/${gameId}/video.mp4`;
    console.log('Fetching from R2:', videoKey);

    const response = await r2Client.send(new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET || 'aiscoutvideos',
      Key: videoKey,
    }));

    await pipeline(response.Body as any, fs.createWriteStream(videoPath));
    const stats = fs.statSync(videoPath);
    console.log('Downloaded:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    } catch (e) {
      console.error('Failed to download video from R2:', e);
      process.exit(1);
    }
  }

  console.log('Video ready at:', videoPath);

  // Get video duration
  let duration = 0;
  try {
    const ffprobeOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: 'utf-8' }
    );
    duration = parseFloat(ffprobeOutput.trim());
    console.log('Video duration:', Math.floor(duration / 60), 'minutes', Math.floor(duration % 60), 'seconds');
  } catch (e) {
    console.warn('Could not get video duration');
  }

  // Initialize Gemini
  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
  const model = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',  // Gemini 3 with better video understanding
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 1.0,  // Default - don't lower, causes issues
      // @ts-ignore - Gemini 3 specific settings
      thinkingConfig: { thinkingLevel: 'HIGH' },
    },
  });
  const sport = game.sport || 'basketball';

  let analysis: any;

  if (duration > CHUNK_THRESHOLD_SECONDS) {
    // Long video - chunk it
    console.log(`\nVideo is ${Math.floor(duration / 60)} minutes - chunking into ${CHUNK_DURATION_SECONDS / 60} minute segments...`);
    analysis = await analyzeInChunks(gameId, videoPath, tempDir, duration, sport, genai, fileManager, model);
  } else {
    // Short video - analyze directly
    console.log('\nVideo is short enough for direct analysis');
    analysis = await analyzeSingleVideo(videoPath, sport, genai, fileManager, model);
  }

  await db.update(games).set({ processingProgress: 60 }).where(eq(games.id, gameId));

  // Validate stats
  console.log('\n=== STAT VALIDATION ===');
  if (analysis.playerScouting) {
    for (const player of analysis.playerScouting) {
      const bs = player.boxScore || {};
      const twoPointers = (bs.fieldGoalsMade || 0) - (bs.threePointersMade || 0);
      const calculatedPoints = twoPointers * 2 + (bs.threePointersMade || 0) * 3 + (bs.freeThrowsMade || 0);
      const match = calculatedPoints === (bs.points || 0);

      console.log(`#${player.jersey} (${player.team}): ${bs.points || 0} pts, FG: ${bs.fieldGoalsMade || 0}/${bs.fieldGoalsAttempted || 0}, 3P: ${bs.threePointersMade || 0}/${bs.threePointersAttempted || 0}, shotLog: ${player.shotLog?.length || 0} entries ${match ? '✅' : '❌ MISMATCH'}`);
    }
  }

  await db.update(games).set({ processingProgress: 80 }).where(eq(games.id, gameId));

  // Store results
  console.log('\nStoring analysis in database...');

  // Add duration to analysis
  analysis._actualDuration = duration;

  // Store in geminiAnalysis field
  await db.update(games).set({
    geminiAnalysis: analysis,
  }).where(eq(games.id, gameId));

  // Create detected teams
  let homeTeamId: string | undefined;
  let awayTeamId: string | undefined;

  if (analysis.gameInfo?.teams?.home) {
    const [homeTeam] = await db.insert(detectedTeams).values({
      gameId,
      teamLabel: 'home',
      primaryJerseyColor: analysis.gameInfo.teams.home.jerseyColor,
      teamName: analysis.gameInfo.teams.home.name,
    }).returning();
    homeTeamId = homeTeam?.id;
  }

  if (analysis.gameInfo?.teams?.away) {
    const [awayTeam] = await db.insert(detectedTeams).values({
      gameId,
      teamLabel: 'away',
      primaryJerseyColor: analysis.gameInfo.teams.away.jerseyColor,
      teamName: analysis.gameInfo.teams.away.name,
    }).returning();
    awayTeamId = awayTeam?.id;
  }

  // Store plays
  if (analysis.plays && Array.isArray(analysis.plays)) {
    for (const play of analysis.plays) {
      await db.insert(detectedPlays).values({
        gameId,
        startTimestamp: play.startSeconds?.toString() || '0',
        endTimestamp: play.endSeconds?.toString() || '0',
        playType: play.offensiveSet?.playType || 'unknown',
        formation: play.offensiveSet?.formation || null,
        possessionTeamId: play.teamWithPossession === 'home' ? homeTeamId : awayTeamId,
        shotType: play.result?.shotType || null,
        shotMade: play.result?.pointsScored ? true : play.result?.outcome?.includes('made') || false,
        shotAttempted: play.result?.shotType ? true : false,
        turnover: play.result?.outcome === 'turnover',
        confidence: play.offensiveSet?.confidence === 'high' ? '0.90' : play.offensiveSet?.confidence === 'medium' ? '0.70' : '0.50',
        rawData: play,
      });
    }
    console.log(`Stored ${analysis.plays.length} plays`);
  }

  // Store players
  if (analysis.playerScouting && Array.isArray(analysis.playerScouting)) {
    for (const player of analysis.playerScouting) {
      const teamId = player.team === 'home' ? homeTeamId : awayTeamId;

      const [insertedPlayer] = await db.insert(detectedPlayers).values({
        gameId,
        detectedTeamId: teamId || undefined,
        jerseyNumber: player.jersey,
        displayName: `#${player.jersey}`,
        positionGuess: player.estimatedPosition || null,
        jerseyNumberConfidence: '0.90',
      }).returning();

      if (insertedPlayer) {
        const gradeStr = player.offensiveSkills?.scoring?.overall;
        const gradeNum = gradeStr ? gradeToNumber(gradeStr).toString() : null;

        await db.insert(playerAnalysis).values({
          detectedPlayerId: insertedPlayer.id,
          overallGrade: gradeNum,
          metrics: {
            boxScore: player.boxScore,
            shotLog: player.shotLog,
          },
          tendencies: player.tendencies,
          strengths: {
            offensiveSkills: player.offensiveSkills,
            defensiveSkills: player.defensiveSkills,
          },
          summary: player.scoutingSummary,
        });

        // Store highlights as key moments
        if (player.highlights && Array.isArray(player.highlights)) {
          for (const highlight of player.highlights) {
            await db.insert(keyMoments).values({
              detectedPlayerId: insertedPlayer.id,
              timestampSeconds: highlight.seconds?.toString() || '0',
              momentType: highlight.type || 'highlight',
              sentiment: highlight.type === 'mistake' ? 'negative' : 'positive',
              description: highlight.description,
            });
          }
        }
      }
    }
    console.log(`Stored ${analysis.playerScouting.length} players`);
  }

  // Store team analysis
  if (analysis.teamAnalysis) {
    for (const [teamLabel, teamData] of Object.entries(analysis.teamAnalysis)) {
      const teamId = teamLabel === 'home' ? homeTeamId : awayTeamId;
      if (teamId && teamData) {
        const data = teamData as any;
        await db.insert(teamAnalysis).values({
          detectedTeamId: teamId,
          tendencies: {
            offensive: data.offensiveTendencies,
            defensive: data.defensiveTendencies,
            strengths: data.strengths,
            weaknesses: data.weaknesses,
          },
          offensiveMetrics: data.offensiveTendencies,
          defensiveMetrics: data.defensiveTendencies,
        });
      }
    }
  }

  // Update game status
  await db.update(games).set({
    status: 'ready',
    processingProgress: 100,
  }).where(eq(games.id, gameId));

  // Cleanup
  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
  }

  // Calculate final score
  let homeScore = 0;
  let awayScore = 0;
  const homePlayers: string[] = [];
  const awayPlayers: string[] = [];

  for (const player of (analysis.playerScouting || [])) {
    const pts = player.boxScore?.points || 0;
    if (player.team === 'home') {
      homeScore += pts;
      if (pts > 0) homePlayers.push(`#${player.jersey}: ${pts}`);
    } else {
      awayScore += pts;
      if (pts > 0) awayPlayers.push(`#${player.jersey}: ${pts}`);
    }
  }

  console.log('\n=== ANALYSIS COMPLETE ===');
  console.log('Game status: ready');
  console.log('Players:', analysis.playerScouting?.length || 0);
  console.log('Plays:', analysis.plays?.length || 0);

  console.log('\n=== FINAL SCORE ===');
  console.log(`HOME: ${homeScore} pts`);
  homePlayers.sort((a, b) => parseInt(b.split(': ')[1]) - parseInt(a.split(': ')[1]));
  for (const p of homePlayers.slice(0, 5)) console.log(`  ${p}`);

  console.log(`\nAWAY: ${awayScore} pts`);
  awayPlayers.sort((a, b) => parseInt(b.split(': ')[1]) - parseInt(a.split(': ')[1]));
  for (const p of awayPlayers.slice(0, 5)) console.log(`  ${p}`);

  console.log(`\nFINAL: HOME ${homeScore} - AWAY ${awayScore}`);
  console.log('\nView the game at: http://localhost:3000/game/' + gameId);
}

async function analyzeSingleVideo(
  videoPath: string,
  sport: string,
  genai: any,
  fileManager: any,
  model: any
): Promise<any> {
  console.log('Uploading video to Gemini...');
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: 'game-video',
  });

  console.log(`Uploaded: ${uploadResult.file.name}, waiting for processing...`);
  let file = uploadResult.file;
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 5000));
    file = await fileManager.getFile(file.name);
    console.log(`  File state: ${file.state}`);
  }

  if (file.state === 'FAILED') {
    throw new Error('Video processing failed');
  }

  console.log('Video ready, running analysis...');
  const prompt = buildChunkPrompt(sport, 0, null);
  const result = await model.generateContent([
    { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
    { text: prompt },
  ]);

  const responseText = result.response.text();
  console.log('\n=== RAW RESPONSE (first 2000 chars) ===');
  console.log(responseText.substring(0, 2000));
  console.log('...\n');

  return parseAnalysisResponse(responseText);
}

async function analyzeInChunks(
  gameId: string,
  videoPath: string,
  tempDir: string,
  duration: number,
  sport: string,
  genai: any,
  fileManager: any,
  model: any
): Promise<any> {
  // Calculate chunks
  const numChunks = Math.ceil(duration / CHUNK_DURATION_SECONDS);
  console.log(`Splitting video into ${numChunks} chunks...`);

  // Split video into chunks using ffmpeg
  const chunkPaths: string[] = [];
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION_SECONDS;
    const chunkPath = path.join(tempDir, `chunk_${i}.mp4`);

    console.log(`Creating chunk ${i + 1}/${numChunks} starting at ${Math.floor(startTime / 60)}:${Math.floor(startTime % 60).toString().padStart(2, '0')}...`);

    execSync(
      `ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${CHUNK_DURATION_SECONDS} -c copy "${chunkPath}" 2>/dev/null`,
      { encoding: 'utf8' }
    );

    chunkPaths.push(chunkPath);
  }

  await db.update(games).set({ processingProgress: 20 }).where(eq(games.id, gameId));

  console.log(`Created ${chunkPaths.length} chunks, uploading to Gemini...`);

  // Upload all chunks to Gemini (in parallel)
  const uploadPromises = chunkPaths.map(async (chunkPath, i) => {
    const uploadResult = await fileManager.uploadFile(chunkPath, {
      mimeType: 'video/mp4',
      displayName: `game-chunk-${i + 1}`,
    });
    console.log(`Uploaded chunk ${i + 1}: ${uploadResult.file.name}`);
    return uploadResult.file;
  });

  const uploadedFiles = await Promise.all(uploadPromises);

  await db.update(games).set({ processingProgress: 35 }).where(eq(games.id, gameId));

  // Wait for all files to finish processing
  console.log('Waiting for Gemini to process all chunks...');
  const readyFiles = await Promise.all(
    uploadedFiles.map(async (file) => {
      let f = file;
      while (f.state === 'PROCESSING') {
        await new Promise(r => setTimeout(r, 3000));
        f = await fileManager.getFile(f.name);
      }
      if (f.state === 'FAILED') {
        throw new Error(`Chunk ${f.displayName} processing failed`);
      }
      console.log(`Chunk ${f.displayName} ready`);
      return f;
    })
  );

  await db.update(games).set({ processingProgress: 50 }).where(eq(games.id, gameId));

  console.log('All chunks ready, analyzing (2 at a time to avoid rate limits)...');

  // Analyze each chunk (2 at a time)
  const chunkAnalyses: any[] = [];
  for (let i = 0; i < readyFiles.length; i += 2) {
    const batch = readyFiles.slice(i, i + 2);
    const batchResults = await Promise.all(
      batch.map(async (file, batchIndex) => {
        const chunkIndex = i + batchIndex;
        const chunkStartTime = chunkIndex * CHUNK_DURATION_SECONDS;

        console.log(`Analyzing chunk ${chunkIndex + 1}/${readyFiles.length}...`);

        const prompt = buildChunkPrompt(sport, chunkStartTime, chunkIndex + 1);

        // Retry logic for failed chunks
        let parsed: any = { plays: [], playerScouting: [] };
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            const result = await model.generateContent([
              { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
              { text: prompt },
            ]);

            const responseText = result.response.text();
            parsed = parseAnalysisResponse(responseText);

            // Check if parse was successful (has players or plays)
            if ((parsed.playerScouting?.length > 0 || parsed.plays?.length > 0) && !parsed.rawResponse) {
              break; // Success
            }

            if (attempts < maxAttempts) {
              console.log(`  Chunk ${chunkIndex + 1} returned empty/invalid, retrying (${attempts}/${maxAttempts})...`);
              await new Promise(r => setTimeout(r, 5000)); // Wait 5s before retry
            }
          } catch (err: any) {
            console.log(`  Chunk ${chunkIndex + 1} error: ${err.message}, retrying (${attempts}/${maxAttempts})...`);
            if (attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 5000));
            }
          }
        }

        parsed._chunkIndex = chunkIndex;
        parsed._chunkStartTime = chunkStartTime;

        console.log(`Chunk ${chunkIndex + 1} analyzed: ${parsed.playerScouting?.length || 0} players, ${parsed.plays?.length || 0} plays`);
        return parsed;
      })
    );

    chunkAnalyses.push(...batchResults);
  }

  console.log(`All ${chunkAnalyses.length} chunks analyzed, aggregating results...`);
  return aggregateChunkAnalyses(chunkAnalyses);
}

function aggregateChunkAnalyses(chunks: any[]): any {
  // Combine all plays with adjusted timestamps
  const allPlays: any[] = [];
  chunks.forEach(chunk => {
    const chunkStartTime = chunk._chunkStartTime || 0;
    (chunk.plays || []).forEach((play: any) => {
      allPlays.push({
        ...play,
        playNumber: allPlays.length + 1,
        startSeconds: (play.startSeconds || 0) + chunkStartTime,
        endSeconds: (play.endSeconds || 0) + chunkStartTime,
        _sourceChunk: chunk._chunkIndex,
      });
    });
  });

  // Aggregate player stats
  const playerMap = new Map<string, any>();
  chunks.forEach(chunk => {
    (chunk.playerScouting || []).forEach((player: any) => {
      const key = `${player.team}-${player.jersey}`;
      if (!playerMap.has(key)) {
        playerMap.set(key, {
          ...player,
          boxScore: { ...player.boxScore },
          highlights: [...(player.highlights || [])],
          shotLog: [...(player.shotLog || [])],
          _appearances: 1,
        });
      } else {
        const existing = playerMap.get(key);
        // Aggregate box score stats
        if (player.boxScore && existing.boxScore) {
          existing.boxScore.points = (existing.boxScore.points || 0) + (player.boxScore.points || 0);
          existing.boxScore.fieldGoalsMade = (existing.boxScore.fieldGoalsMade || 0) + (player.boxScore.fieldGoalsMade || 0);
          existing.boxScore.fieldGoalsAttempted = (existing.boxScore.fieldGoalsAttempted || 0) + (player.boxScore.fieldGoalsAttempted || 0);
          existing.boxScore.threePointersMade = (existing.boxScore.threePointersMade || 0) + (player.boxScore.threePointersMade || 0);
          existing.boxScore.threePointersAttempted = (existing.boxScore.threePointersAttempted || 0) + (player.boxScore.threePointersAttempted || 0);
          existing.boxScore.freeThrowsMade = (existing.boxScore.freeThrowsMade || 0) + (player.boxScore.freeThrowsMade || 0);
          existing.boxScore.freeThrowsAttempted = (existing.boxScore.freeThrowsAttempted || 0) + (player.boxScore.freeThrowsAttempted || 0);
          existing.boxScore.totalRebounds = (existing.boxScore.totalRebounds || 0) + (player.boxScore.totalRebounds || 0);
          existing.boxScore.assists = (existing.boxScore.assists || 0) + (player.boxScore.assists || 0);
          existing.boxScore.steals = (existing.boxScore.steals || 0) + (player.boxScore.steals || 0);
          existing.boxScore.blocks = (existing.boxScore.blocks || 0) + (player.boxScore.blocks || 0);
          existing.boxScore.turnovers = (existing.boxScore.turnovers || 0) + (player.boxScore.turnovers || 0);
        }
        if (player.highlights) existing.highlights.push(...player.highlights);
        if (player.shotLog) existing.shotLog.push(...player.shotLog);
        existing._appearances++;
      }
    });
  });

  // Use game info from first chunk
  const gameInfo = chunks[0]?.gameInfo || {};

  // Merge team analysis
  const teamAnalysis: any = {};
  chunks.forEach(chunk => {
    if (chunk.teamAnalysis) {
      for (const [team, data] of Object.entries(chunk.teamAnalysis)) {
        if (!teamAnalysis[team]) {
          teamAnalysis[team] = data;
        } else {
          const existing = teamAnalysis[team] as any;
          const newData = data as any;
          if (newData.strengths) {
            existing.strengths = [...new Set([...(existing.strengths || []), ...newData.strengths])];
          }
          if (newData.weaknesses) {
            existing.weaknesses = [...new Set([...(existing.weaknesses || []), ...newData.weaknesses])];
          }
        }
      }
    }
  });

  console.log(`Aggregated: ${allPlays.length} plays, ${playerMap.size} unique players`);

  // Fix any inconsistencies where made > attempted
  for (const player of playerMap.values()) {
    const bs = player.boxScore;
    if (bs) {
      // Recalculate attempts from shotLog if available
      if (player.shotLog && player.shotLog.length > 0) {
        const fgMade = player.shotLog.filter((s: any) => (s.type === '2pt' || s.type === '3pt') && s.result === 'made').length;
        const fgAttempted = player.shotLog.filter((s: any) => s.type === '2pt' || s.type === '3pt').length;
        const threePtMade = player.shotLog.filter((s: any) => s.type === '3pt' && s.result === 'made').length;
        const threePtAttempted = player.shotLog.filter((s: any) => s.type === '3pt').length;
        const ftMade = player.shotLog.filter((s: any) => s.type === 'ft' && s.result === 'made').length;
        const ftAttempted = player.shotLog.filter((s: any) => s.type === 'ft').length;

        // Use shotLog as source of truth
        bs.fieldGoalsMade = fgMade;
        bs.fieldGoalsAttempted = fgAttempted;
        bs.threePointersMade = threePtMade;
        bs.threePointersAttempted = threePtAttempted;
        bs.freeThrowsMade = ftMade;
        bs.freeThrowsAttempted = ftAttempted;

        // Recalculate points
        const twoPointMade = fgMade - threePtMade;
        bs.points = (twoPointMade * 2) + (threePtMade * 3) + ftMade;
      } else {
        // Fallback: ensure made <= attempted
        if (bs.fieldGoalsMade > bs.fieldGoalsAttempted) {
          bs.fieldGoalsAttempted = bs.fieldGoalsMade;
        }
        if (bs.threePointersMade > bs.threePointersAttempted) {
          bs.threePointersAttempted = bs.threePointersMade;
        }
        if (bs.freeThrowsMade > bs.freeThrowsAttempted) {
          bs.freeThrowsAttempted = bs.freeThrowsMade;
        }
      }
    }
  }

  return {
    gameInfo,
    plays: allPlays,
    playerScouting: Array.from(playerMap.values()),
    teamAnalysis,
    coachingInsights: chunks[chunks.length - 1]?.coachingInsights || null,
    chunksAnalyzed: chunks.length,
  };
}

function gradeToNumber(grade: string): number {
  const grades: Record<string, number> = {
    'A+': 98, 'A': 95, 'A-': 92,
    'B+': 88, 'B': 85, 'B-': 82,
    'C+': 78, 'C': 75, 'C-': 72,
    'D+': 68, 'D': 65, 'D-': 62,
    'F': 50,
  };
  return grades[grade] || 75;
}

function parseAnalysisResponse(text: string): any {
  // With responseMimeType: 'application/json', Gemini returns clean JSON
  // But keep fallback for markdown-wrapped responses just in case
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.slice(7);
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.slice(3);
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
  }

  try {
    return JSON.parse(cleanText.trim());
  } catch (e) {
    // Try to fix common JSON issues
    let fixed = cleanText.trim();
    // Remove any trailing commas before closing brackets
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    // Remove control characters
    fixed = fixed.replace(/[\x00-\x1F\x7F]/g, ' ');

    try {
      return JSON.parse(fixed);
    } catch (e2) {
      console.error('Failed to parse Gemini response:', e);
      console.error('Raw response:', text.substring(0, 500));
      return { plays: [], playerScouting: [], rawResponse: text };
    }
  }
}

function buildChunkPrompt(sport: string, chunkStartSeconds: number, chunkNumber: number | null): string {
  const chunkInfo = chunkNumber
    ? `\n\nNOTE: This is chunk ${chunkNumber} of a longer game. Video starts at ${Math.floor(chunkStartSeconds / 60)}:${(chunkStartSeconds % 60).toString().padStart(2, '0')} of the full game. Report timestamps relative to THIS clip (starting at 0:00).`
    : '';

  return `You are an elite ${sport} statistician and scout. Your job is to NOT MISS any shot attempts.${chunkInfo}

=== COMMON MISTAKES TO AVOID ===
- Missing free throws after fouls (watch for players at the free throw line)
- Missing fast break layups (these happen quickly after turnovers)
- Forgetting to count MISSED shots as attempts
- Missing and-1 plays (made shot + foul = shot attempt + possibly free throws)
- Missing tip-ins and putbacks after offensive rebounds
- Skipping transition baskets

Count EVERY ball that goes toward the basket, whether it goes in or not.

For EACH shot you see:
1. Note the timestamp (MM:SS)
2. Identify the shooter by jersey number
3. Classify as 2pt, 3pt, or ft
4. Record if made or missed

=== JSON RESPONSE FORMAT ===
{
  "gameInfo": {
    "duration": "MM:SS",
    "sport": "${sport}",
    "teams": {
      "home": { "name": "team name", "jerseyColor": "primary color" },
      "away": { "name": "team name", "jerseyColor": "primary color" }
    }
  },

  "plays": [
    {
      "playNumber": 1,
      "startTime": "MM:SS",
      "startSeconds": number,
      "endTime": "MM:SS",
      "endSeconds": number,
      "teamWithPossession": "home|away",
      "offensiveSet": {
        "playType": "Half Court|Fast Break|Pick and Roll|Isolation|Post Up|Transition",
        "formation": "5-out|4-out-1-in|horns|motion",
        "confidence": "high|medium|low"
      },
      "result": {
        "outcome": "made 2pt|made 3pt|missed shot|turnover|foul|made ft|missed ft",
        "pointsScored": number or null,
        "shotType": "layup|jumper|3-pointer|dunk|free throw|tip-in",
        "shooter": jersey number,
        "assister": jersey number or null
      },
      "description": "Brief description"
    }
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
      "shotLog": [
        { "time": "MM:SS", "seconds": number, "type": "2pt|3pt|ft", "result": "made|missed", "shotType": "layup|jumper|dunk|hook|free throw|tip-in", "description": "context" }
      ],
      "offensiveSkills": {
        "scoring": { "overall": "A|B|C|D|F", "atRim": "A|B|C|D|F", "threePoint": "A|B|C|D|F" },
        "ballHandling": { "overall": "A|B|C|D|F" },
        "passing": { "overall": "A|B|C|D|F" }
      },
      "defensiveSkills": {
        "onBall": "A|B|C|D|F",
        "helpDefense": "A|B|C|D|F",
        "rebounding": "A|B|C|D|F"
      },
      "tendencies": {
        "preferredHand": "right|left",
        "preferredDirection": "goes right|goes left|no preference"
      },
      "highlights": [
        { "timestamp": "MM:SS", "seconds": number, "type": "great play|mistake", "description": "what happened" }
      ],
      "scoutingSummary": "2-3 sentence assessment"
    }
  ],

  "teamAnalysis": {
    "home": {
      "offensiveTendencies": { "transitionFrequency": "often|sometimes|rarely", "ballMovement": "excellent|good|poor" },
      "defensiveTendencies": { "primaryScheme": "man|zone", "pressureLevel": "high|medium|low" },
      "strengths": ["observed strengths"],
      "weaknesses": ["observed weaknesses"]
    },
    "away": { "...same structure..." }
  },

  "coachingInsights": {
    "gameSummary": "Brief summary",
    "keyObservations": ["notable observations"]
  }
}

=== CRITICAL STAT ACCURACY RULES ===

1. SHOT LOG DRIVES STATS: The shotLog array is your source of truth. Count each entry to calculate boxScore.

2. BOX SCORE CALCULATION:
   - points = (2pt made × 2) + (3pt made × 3) + (ft made × 1)
   - fieldGoalsMade = count of "made" shots where type is "2pt" or "3pt"
   - fieldGoalsAttempted = count of all shots where type is "2pt" or "3pt"
   - threePointersMade = count of "made" shots where type is "3pt"
   - freeThrowsMade = count of "made" shots where type is "ft"

3. COMMON MISTAKES TO AVOID:
   - Missing free throws after fouls (watch for players at the line)
   - Forgetting to count MISSED shots as attempts
   - Missing fast break layups (these happen quickly)
   - Missing and-1 plays (made shot followed by free throw)
   - Missing tip-ins after offensive rebounds

4. VERIFICATION: Before finalizing, verify each player's points matches their shotLog.

Grade skills A-F based on what you observe. Track every player on both teams.`;
}

main().catch(console.error);
