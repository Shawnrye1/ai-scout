import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedTeams, detectedPlayers, playerAnalysis, keyMoments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDownloadPresignedUrl } from '@/lib/storage/r2';
import { runMultiAgentAnalysis } from '@/lib/analysis/multi-agent-gemini';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * POST /api/games/[id]/analyze-gemini
 *
 * Trigger multi-agent two-pass Gemini analysis for a game.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    // Get game info
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get video URL
    let videoUrl = game.videoUrl;
    if (game.videoKey) {
      try {
        videoUrl = await getDownloadPresignedUrl(game.videoKey, 3600 * 4);
      } catch (e) {
        console.error('Failed to generate presigned URL:', e);
      }
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'No video URL available' }, { status: 400 });
    }

    // Update status to analyzing
    await db
      .update(games)
      .set({
        status: 'analyzing',
        processingProgress: 5,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    // Download video to temp file
    console.log('Downloading video for Gemini analysis...');
    const tempDir = path.join(os.tmpdir(), `gemini-${gameId}-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, 'source.mp4');

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(videoBuffer));
    console.log(`Video downloaded to ${tempPath}`);

    // Run multi-agent analysis with progress updates
    const analysis = await runMultiAgentAnalysis(
      tempPath,
      async (progress, message) => {
        console.log(`[${progress}%] ${message}`);
        await db
          .update(games)
          .set({ processingProgress: progress })
          .where(eq(games.id, gameId));
      },
      game.boxScore || undefined // Pass box score if available
    );

    // Store results in database
    await storeAnalysisResults(gameId, analysis);

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to clean up temp directory:', e);
    }

    // Mark game as ready
    await db
      .update(games)
      .set({
        status: 'ready',
        processingProgress: 100,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    const playerCount = analysis.playerScouting?.players?.length || 0;

    return NextResponse.json({
      success: true,
      message: 'Multi-agent Gemini analysis complete',
      analysis: {
        method: 'multi-agent-two-pass',
        playersDetected: playerCount,
        homeTeam: analysis.homeTeamName,
        awayTeam: analysis.awayTeamName,
      },
    });
  } catch (error) {
    console.error('Gemini analysis failed:', error);

    try {
      const { id: gameId } = await params;
      await db
        .update(games)
        .set({
          status: 'failed',
          processingError: error instanceof Error ? error.message : 'Analysis failed',
          updatedAt: new Date(),
        })
        .where(eq(games.id, gameId));
    } catch (e) {
      console.error('Failed to update game status:', e);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gemini analysis failed' },
      { status: 500 }
    );
  }
}

async function storeAnalysisResults(gameId: string, analysis: any) {
  // Store full analysis JSON on game record
  await db
    .update(games)
    .set({
      geminiAnalysis: analysis,
    })
    .where(eq(games.id, gameId));

  // Store teams
  const homeTeamName = analysis.homeTeamName || 'Home';
  const awayTeamName = analysis.awayTeamName || 'Away';
  const homeJerseyColor = analysis.teamScouting?.homeTeam?.jerseyColor;
  const awayJerseyColor = analysis.teamScouting?.awayTeam?.jerseyColor;

  await db.insert(detectedTeams).values({
    gameId,
    teamLabel: 'home',
    teamName: homeTeamName,
    primaryJerseyColor: homeJerseyColor || null,
    isUserTeam: true,
  }).onConflictDoNothing();

  await db.insert(detectedTeams).values({
    gameId,
    teamLabel: 'away',
    teamName: awayTeamName,
    primaryJerseyColor: awayJerseyColor || null,
    isUserTeam: false,
  }).onConflictDoNothing();

  // Get team IDs
  const dbTeams = await db
    .select()
    .from(detectedTeams)
    .where(eq(detectedTeams.gameId, gameId));

  const homeTeamId = dbTeams.find(t => t.teamLabel === 'home')?.id;
  const awayTeamId = dbTeams.find(t => t.teamLabel === 'away')?.id;

  // Store players
  const players = analysis.playerScouting?.players || [];
  for (const player of players) {
    const teamId = player.team === 'home' ? homeTeamId : awayTeamId;
    const jerseyNumber = player.jerseyNumber || player.jersey;

    const [insertedPlayer] = await db.insert(detectedPlayers).values({
      gameId,
      detectedTeamId: teamId || null,
      jerseyNumber: jerseyNumber,
      displayName: `#${jerseyNumber}`,
      positionGuess: player.position || null,
      jerseyNumberConfidence: '0.90',
    }).onConflictDoNothing().returning();

    let playerId: string | undefined = insertedPlayer?.id;
    if (!playerId) {
      const existing = await db
        .select()
        .from(detectedPlayers)
        .where(eq(detectedPlayers.gameId, gameId))
        .then(players => players.find(p => p.jerseyNumber === jerseyNumber));
      playerId = existing?.id;
    }

    if (playerId) {
      await db.insert(playerAnalysis).values({
        detectedPlayerId: playerId,
        summary: player.overallAssessment,
        tendencies: {
          preferredHand: player.preferredHand,
          primaryMoves: player.primaryMoves,
          defensiveRating: player.defensiveRating,
        },
        strengths: {
          howToGuard: player.howToGuard,
          howToAttack: player.howToAttack,
        },
      }).onConflictDoNothing();
    }
  }

  console.log(`Stored multi-agent analysis for game ${gameId}:`, {
    players: players.length,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
  });
}
