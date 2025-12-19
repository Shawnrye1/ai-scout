import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlayers, playerAnalysis, keyMoments, detectedTeams, games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get player with analysis, key moments, team, and game info
    const [player] = await db
      .select({
        id: detectedPlayers.id,
        gameId: detectedPlayers.gameId,
        jerseyNumber: detectedPlayers.jerseyNumber,
        jerseyNumberConfidence: detectedPlayers.jerseyNumberConfidence,
        displayName: detectedPlayers.displayName,
        positionGuess: detectedPlayers.positionGuess,
        framesVisible: detectedPlayers.framesVisible,
        thumbnailUrl: detectedPlayers.thumbnailUrl,
        trackingId: detectedPlayers.trackingId,
        createdAt: detectedPlayers.createdAt,
        // Team info
        detectedTeamId: detectedPlayers.detectedTeamId,
      })
      .from(detectedPlayers)
      .where(eq(detectedPlayers.id, id))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get team info
    let team = null;
    if (player.detectedTeamId) {
      const [teamData] = await db
        .select({
          id: detectedTeams.id,
          teamLabel: detectedTeams.teamLabel,
          teamName: detectedTeams.teamName,
          primaryJerseyColor: detectedTeams.primaryJerseyColor,
          isUserTeam: detectedTeams.isUserTeam,
        })
        .from(detectedTeams)
        .where(eq(detectedTeams.id, player.detectedTeamId))
        .limit(1);
      team = teamData;
    }

    // Get game info
    const [game] = await db
      .select({
        id: games.id,
        name: games.name,
        title: games.title,
        sport: games.sport,
        videoUrl: games.videoUrl,
        thumbnailUrl: games.thumbnailUrl,
        userId: games.userId,
      })
      .from(games)
      .where(eq(games.id, player.gameId))
      .limit(1);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify user has access to this game
    if (game.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get analysis
    const [analysis] = await db
      .select({
        id: playerAnalysis.id,
        overallGrade: playerAnalysis.overallGrade,
        summary: playerAnalysis.summary,
        fullReport: playerAnalysis.fullReport,
        strengths: playerAnalysis.strengths,
        developmentAreas: playerAnalysis.developmentAreas,
        tendencies: playerAnalysis.tendencies,
        metrics: playerAnalysis.metrics,
        athleticismGrade: playerAnalysis.athleticismGrade,
        techniqueGrade: playerAnalysis.techniqueGrade,
        decisionMakingGrade: playerAnalysis.decisionMakingGrade,
        consistencyGrade: playerAnalysis.consistencyGrade,
      })
      .from(playerAnalysis)
      .where(eq(playerAnalysis.detectedPlayerId, id))
      .limit(1);

    // Get key moments
    const moments = await db
      .select({
        id: keyMoments.id,
        timestampSeconds: keyMoments.timestampSeconds,
        momentType: keyMoments.momentType,
        sentiment: keyMoments.sentiment,
        description: keyMoments.description,
        thumbnailUrl: keyMoments.thumbnailUrl,
        clipUrl: keyMoments.clipUrl,
      })
      .from(keyMoments)
      .where(eq(keyMoments.detectedPlayerId, id))
      .orderBy(keyMoments.timestampSeconds);

    return NextResponse.json({
      player: {
        ...player,
        detectedTeam: team,
        analysis,
        keyMoments: moments,
      },
      game: {
        id: game.id,
        name: game.name,
        title: game.title,
        sport: game.sport,
        videoUrl: game.videoUrl,
        thumbnailUrl: game.thumbnailUrl,
      },
    });
  } catch (error) {
    console.error('Player API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
