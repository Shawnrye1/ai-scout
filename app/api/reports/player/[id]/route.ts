import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedTeams, playerAnalysis, keyMoments } from '@/lib/db/schema';
import { eq, desc, and, inArray, isNotNull } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: playerId } = await params;

    // Get the player's base info
    const [player] = await db
      .select({
        id: detectedPlayers.id,
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
        position: detectedPlayers.positionGuess,
        gameId: detectedPlayers.gameId,
        teamName: detectedTeams.teamName,
        teamLabel: detectedTeams.teamLabel,
      })
      .from(detectedPlayers)
      .leftJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
      .where(eq(detectedPlayers.id, playerId));

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get all games for this user
    const userGames = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.userId, user.id));
    const gameIds = userGames.map((g) => g.id);

    // Find all instances of this player (by jersey number) across games
    const playerInstances = await db
      .select({
        playerId: detectedPlayers.id,
        jerseyNumber: detectedPlayers.jerseyNumber,
        gameId: detectedPlayers.gameId,
        gameName: games.name,
        gameTitle: games.title,
        gameDate: games.createdAt,
        overallGrade: playerAnalysis.overallGrade,
        metrics: playerAnalysis.metrics,
        tendencies: playerAnalysis.tendencies,
        strengths: playerAnalysis.strengths,
        developmentAreas: playerAnalysis.developmentAreas,
      })
      .from(detectedPlayers)
      .innerJoin(games, eq(games.id, detectedPlayers.gameId))
      .leftJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
      .innerJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
      .where(
        and(
          inArray(detectedPlayers.gameId, gameIds),
          eq(detectedPlayers.jerseyNumber, player.jerseyNumber),
          eq(detectedTeams.isUserTeam, true)
        )
      )
      .orderBy(desc(games.createdAt));

    // Aggregate stats
    let totalPoints = 0;
    let totalRebounds = 0;
    let totalAssists = 0;
    const gradeHistory: { grade: number; date: string; gameName: string }[] = [];
    let latestTendencies: any = null;
    let latestStrengths: any = null;
    const allDevAreas: string[] = [];

    for (const inst of playerInstances) {
      if (inst.overallGrade) {
        gradeHistory.push({
          grade: parseFloat(inst.overallGrade.toString()),
          date: inst.gameDate?.toISOString() || '',
          gameName: inst.gameName || inst.gameTitle || 'Game',
        });
      }

      const metrics = inst.metrics as any;
      if (metrics) {
        totalPoints += metrics.points || metrics.totalPoints || 0;
        totalRebounds += metrics.rebounds || metrics.totalRebounds || 0;
        totalAssists += metrics.assists || 0;
      }

      if (inst.tendencies && !latestTendencies) {
        latestTendencies = inst.tendencies;
      }

      if (inst.strengths && !latestStrengths) {
        latestStrengths = inst.strengths;
      }

      const devAreas = inst.developmentAreas as any;
      if (Array.isArray(devAreas)) {
        for (const area of devAreas) {
          const areaText = typeof area === 'string' ? area : area?.area || area?.description;
          if (areaText && !allDevAreas.includes(areaText)) {
            allDevAreas.push(areaText);
          }
        }
      }
    }

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (gradeHistory.length >= 2) {
      const recent = gradeHistory.slice(0, 2);
      const older = gradeHistory.slice(2, 4);
      const recentAvg = recent.reduce((sum, g) => sum + g.grade, 0) / recent.length;
      const olderAvg = older.length > 0
        ? older.reduce((sum, g) => sum + g.grade, 0) / older.length
        : recentAvg;
      const diff = recentAvg - olderAvg;
      if (diff >= 3) trend = 'up';
      else if (diff <= -3) trend = 'down';
    }

    // Get key moments for this player
    const playerIds = playerInstances.map((p) => p.playerId);
    const moments = playerIds.length > 0
      ? await db
          .select({
            description: keyMoments.description,
            sentiment: keyMoments.sentiment,
            timestampSeconds: keyMoments.timestampSeconds,
          })
          .from(keyMoments)
          .where(inArray(keyMoments.detectedPlayerId, playerIds))
          .orderBy(desc(keyMoments.createdAt))
          .limit(10)
      : [];

    const currentGrade = gradeHistory.length > 0 ? gradeHistory[0].grade : 0;
    const avgGrade = gradeHistory.length > 0
      ? gradeHistory.reduce((sum, g) => sum + g.grade, 0) / gradeHistory.length
      : 0;

    const report = {
      jerseyNumber: player.jerseyNumber || '?',
      displayName: player.displayName || `#${player.jerseyNumber}`,
      position: player.position || null,
      teamName: player.teamName || player.teamLabel || 'Team',
      currentGrade,
      avgGrade,
      gamesPlayed: playerInstances.length,
      trend,
      gradeHistory: gradeHistory.reverse(), // Oldest first for chart
      stats: {
        points: totalPoints,
        rebounds: totalRebounds,
        assists: totalAssists,
      },
      tendencies: latestTendencies,
      strengths: latestStrengths,
      developmentAreas: allDevAreas.slice(0, 5),
      keyMoments: moments.map((m) => ({
        description: m.description || '',
        sentiment: m.sentiment || 'neutral',
        timestamp: m.timestampSeconds
          ? `${Math.floor(parseFloat(m.timestampSeconds) / 60)}:${String(Math.floor(parseFloat(m.timestampSeconds) % 60)).padStart(2, '0')}`
          : null,
      })),
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Player report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
