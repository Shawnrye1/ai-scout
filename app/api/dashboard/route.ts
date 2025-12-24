import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedTeams, playerAnalysis } from '@/lib/db/schema';
import { desc, eq, gte, sql, and, isNotNull, inArray } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total games for this user
    const [gamesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(games)
      .where(eq(games.userId, user.id));

    // Get games this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [gamesThisMonth] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(games)
      .where(
        and(
          eq(games.userId, user.id),
          gte(games.createdAt, startOfMonth)
        )
      );

    // Get total players across all user's games
    const userGames = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.userId, user.id));

    const gameIds = userGames.map((g) => g.id);

    let totalPlayers = 0;
    let avgGrade = 0;
    let processingGames = 0;

    if (gameIds.length > 0) {
      const [playersCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(detectedPlayers)
        .where(inArray(detectedPlayers.gameId, gameIds));

      totalPlayers = playersCount?.count || 0;

      // Get average grade
      const [avgResult] = await db
        .select({ avg: sql<number>`COALESCE(AVG(${playerAnalysis.overallGrade})::numeric(5,2), 0)` })
        .from(playerAnalysis)
        .innerJoin(detectedPlayers, eq(detectedPlayers.id, playerAnalysis.detectedPlayerId))
        .where(inArray(detectedPlayers.gameId, gameIds));

      avgGrade = parseFloat(avgResult?.avg?.toString() || '0');

      // Get processing games count
      const [processingCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(games)
        .where(
          and(
            eq(games.userId, user.id),
            sql`${games.status} IN ('queued', 'detecting', 'tracking', 'analyzing')`
          )
        );

      processingGames = processingCount?.count || 0;
    }

    // Get top performers (players with highest grades)
    const topPlayers = await db
      .select({
        id: detectedPlayers.id,
        displayName: detectedPlayers.displayName,
        jerseyNumber: detectedPlayers.jerseyNumber,
        gameId: detectedPlayers.gameId,
        teamName: detectedTeams.teamName,
        teamLabel: detectedTeams.teamLabel,
        gameName: games.name,
        gameTitle: games.title,
        overallGrade: playerAnalysis.overallGrade,
      })
      .from(playerAnalysis)
      .innerJoin(detectedPlayers, eq(detectedPlayers.id, playerAnalysis.detectedPlayerId))
      .leftJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
      .leftJoin(games, eq(games.id, detectedPlayers.gameId))
      .where(
        and(
          eq(games.userId, user.id),
          isNotNull(playerAnalysis.overallGrade)
        )
      )
      .orderBy(desc(playerAnalysis.overallGrade))
      .limit(10);

    // Get recent games
    const recentGames = await db
      .select({
        id: games.id,
        title: games.title,
        name: games.name,
        opponent: games.opponent,
        sport: games.sport,
        status: games.status,
        createdAt: games.createdAt,
      })
      .from(games)
      .where(eq(games.userId, user.id))
      .orderBy(desc(games.createdAt))
      .limit(5);

    // Get player counts for recent games
    const recentGamesWithCounts = await Promise.all(
      recentGames.map(async (game) => {
        const [playerCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(detectedPlayers)
          .where(eq(detectedPlayers.gameId, game.id));

        return {
          id: game.id,
          title: game.name || game.title || 'Untitled Game',
          opponent: game.opponent,
          sport: game.sport,
          status: game.status,
          playerCount: playerCount?.count || 0,
          createdAt: game.createdAt?.toISOString(),
        };
      })
    );

    return NextResponse.json({
      stats: {
        totalGames: gamesCount?.count || 0,
        gamesThisMonth: gamesThisMonth?.count || 0,
        totalPlayers,
        avgPlayerGrade: avgGrade || 75,
        processingGames,
      },
      topPlayers: topPlayers.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        jerseyNumber: p.jerseyNumber || '??',
        teamName: p.teamName || p.teamLabel || 'Unknown',
        gameId: p.gameId,
        gameName: p.gameName || p.gameTitle || 'Game',
        overallGrade: parseFloat(p.overallGrade?.toString() || '0'),
      })),
      recentGames: recentGamesWithCounts,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({
      stats: {
        totalGames: 0,
        gamesThisMonth: 0,
        totalPlayers: 0,
        avgPlayerGrade: 0,
        processingGames: 0,
      },
      topPlayers: [],
      recentGames: [],
    });
  }
}
