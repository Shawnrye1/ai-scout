import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedTeams, playerAnalysis, teams, teamMembers, sportsTeams, sportsTeamPlayers, keyMoments } from '@/lib/db/schema';
import { desc, eq, gte, sql, and, isNotNull, inArray } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function normalizePosition(position: string | null): string {
  if (!position) return 'Unknown';
  const pos = position.toUpperCase().trim();

  // Guards
  if (pos.includes('PG') || pos === 'POINT GUARD') return 'Point Guard';
  if (pos.includes('SG') || pos === 'SHOOTING GUARD') return 'Shooting Guard';
  if (pos.includes('G') && !pos.includes('F')) return 'Guard';

  // Forwards
  if (pos.includes('SF') || pos === 'SMALL FORWARD') return 'Small Forward';
  if (pos.includes('PF') || pos === 'POWER FORWARD') return 'Power Forward';
  if (pos.includes('F') && !pos.includes('G')) return 'Forward';

  // Center
  if (pos.includes('C') || pos === 'CENTER') return 'Center';

  return position;
}

function normalizeDevArea(area: string): string {
  const lower = area.toLowerCase();

  // Common basketball development areas
  if (lower.includes('shooting') || lower.includes('shot')) return 'Shooting';
  if (lower.includes('defense') || lower.includes('defensive')) return 'Defense';
  if (lower.includes('ball handling') || lower.includes('dribbl')) return 'Ball Handling';
  if (lower.includes('passing') || lower.includes('assist')) return 'Passing';
  if (lower.includes('rebound')) return 'Rebounding';
  if (lower.includes('footwork') || lower.includes('feet')) return 'Footwork';
  if (lower.includes('decision') || lower.includes('iq')) return 'Basketball IQ';
  if (lower.includes('transition') || lower.includes('fast break')) return 'Transition';
  if (lower.includes('post') || lower.includes('low block')) return 'Post Play';
  if (lower.includes('screen') || lower.includes('pick')) return 'Screening';
  if (lower.includes('communication')) return 'Communication';
  if (lower.includes('conditioning') || lower.includes('endurance')) return 'Conditioning';

  // Return cleaned up version
  return area.charAt(0).toUpperCase() + area.slice(1).toLowerCase();
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Run initial queries in parallel
    const [gamesCountResult, gamesThisMonthResult, userGames, processingCountResult] = await Promise.all([
      // Get total games for this user
      db.select({ count: sql<number>`count(*)::int` })
        .from(games)
        .where(eq(games.userId, user.id)),

      // Get games this month
      db.select({ count: sql<number>`count(*)::int` })
        .from(games)
        .where(and(eq(games.userId, user.id), gte(games.createdAt, startOfMonth))),

      // Get all user game IDs
      db.select({ id: games.id })
        .from(games)
        .where(eq(games.userId, user.id)),

      // Get processing games count
      db.select({ count: sql<number>`count(*)::int` })
        .from(games)
        .where(and(
          eq(games.userId, user.id),
          sql`${games.status} IN ('queued', 'detecting', 'tracking', 'analyzing')`
        )),
    ]);

    const gamesCount = gamesCountResult[0];
    const gamesThisMonth = gamesThisMonthResult[0];
    const gameIds = userGames.map((g) => g.id);
    const processingGames = processingCountResult[0]?.count || 0;

    let totalPlayers = 0;
    let avgGrade = 0;
    let topPlayers: any[] = [];
    let recentGames: any[] = [];
    let userTeam: any[] = [];

    if (gameIds.length > 0) {
      // Run ALL main queries in parallel - this is the big optimization
      const [playersCountResult, avgResult, topPlayersResult, recentGamesResult, userTeamResult] = await Promise.all([
        // Player count
        db.select({ count: sql<number>`count(*)::int` })
          .from(detectedPlayers)
          .where(inArray(detectedPlayers.gameId, gameIds)),

        // Average grade
        db.select({ avg: sql<number>`COALESCE(AVG(${playerAnalysis.overallGrade})::numeric(5,2), 0)` })
          .from(playerAnalysis)
          .innerJoin(detectedPlayers, eq(detectedPlayers.id, playerAnalysis.detectedPlayerId))
          .where(inArray(detectedPlayers.gameId, gameIds)),

        // Top performers (players with highest grades)
        db.select({
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
          .limit(10),

        // Recent games with player counts in a single query using subquery
        db.select({
          id: games.id,
          title: games.title,
          name: games.name,
          opponent: games.opponent,
          sport: games.sport,
          status: games.status,
          createdAt: games.createdAt,
          playerCount: sql<number>`(SELECT COUNT(*)::int FROM detected_players WHERE detected_players.game_id = games.id)`,
        })
          .from(games)
          .where(eq(games.userId, user.id))
          .orderBy(desc(games.createdAt))
          .limit(5),

        // User's team
        db.select()
          .from(teamMembers)
          .innerJoin(teams, eq(teams.id, teamMembers.teamId))
          .where(eq(teamMembers.userId, user.id))
          .limit(1),
      ]);

      totalPlayers = playersCountResult[0]?.count || 0;
      avgGrade = parseFloat(avgResult[0]?.avg?.toString() || '0');
      topPlayers = topPlayersResult;
      recentGames = recentGamesResult;
      userTeam = userTeamResult;
    } else {
      // No games - just get user team
      userTeam = await db
        .select()
        .from(teamMembers)
        .innerJoin(teams, eq(teams.id, teamMembers.teamId))
        .where(eq(teamMembers.userId, user.id))
        .limit(1);
    }

    // Format recent games (player count already included in query)
    const recentGamesWithCounts = recentGames.map((game: any) => ({
      id: game.id,
      title: game.name || game.title || 'Untitled Game',
      opponent: game.opponent,
      sport: game.sport,
      status: game.status,
      playerCount: game.playerCount || 0,
      createdAt: game.createdAt?.toISOString(),
    }));

    // Get roster data if user has a linked sports team
    let roster: any[] = [];
    let sportsTeamInfo: any = null;

    if (userTeam.length > 0 && userTeam[0].teams.sportsTeamId) {
      const sportsTeamId = userTeam[0].teams.sportsTeamId;

      // Get sports team info and roster in parallel
      const [teamInfoResult, rosterData] = await Promise.all([
        db.select()
          .from(sportsTeams)
          .where(eq(sportsTeams.id, sportsTeamId)),
        db.select()
          .from(sportsTeamPlayers)
          .where(eq(sportsTeamPlayers.sportsTeamId, sportsTeamId))
          .orderBy(sportsTeamPlayers.jerseyNumber),
      ]);

      sportsTeamInfo = teamInfoResult[0] || null;
      roster = rosterData.map((p) => ({
        id: p.id,
        jerseyNumber: p.jerseyNumber,
        name: p.name,
        position: p.position,
        height: p.height,
        yearGrade: p.yearGrade,
      }));
    }

    // Find latest ready game for moments/insights
    const latestReadyGame = recentGames.find((g: any) => g.status === 'ready');

    // Run all game-dependent queries in parallel
    let recentMoments: any[] = [];
    let coachingInsights: string[] = [];
    let playerDevelopment: any[] = [];
    let statLeaders: any = { points: [], rebounds: [], assists: [] };
    let practiceFocusAreas: any[] = [];
    let teachingMoments: any[] = [];
    let seasonProgression: any[] = [];

    // Build all parallel queries
    const parallelQueries: Promise<any>[] = [];
    const queryKeys: string[] = [];

    // Key moments query
    if (latestReadyGame) {
      queryKeys.push('moments');
      parallelQueries.push(
        db.select({
          id: keyMoments.id,
          description: keyMoments.description,
          momentType: keyMoments.momentType,
          sentiment: keyMoments.sentiment,
          timestampSeconds: keyMoments.timestampSeconds,
          jerseyNumber: detectedPlayers.jerseyNumber,
          displayName: detectedPlayers.displayName,
        })
          .from(keyMoments)
          .innerJoin(detectedPlayers, eq(detectedPlayers.id, keyMoments.detectedPlayerId))
          .where(eq(detectedPlayers.gameId, latestReadyGame.id))
          .orderBy(desc(keyMoments.createdAt))
          .limit(5)
      );

      // Coaching insights query
      queryKeys.push('insights');
      parallelQueries.push(
        db.select({ geminiAnalysis: games.geminiAnalysis })
          .from(games)
          .where(eq(games.id, latestReadyGame.id))
      );

      // Teaching moments query (negative moments)
      queryKeys.push('teaching');
      parallelQueries.push(
        db.select({
          id: keyMoments.id,
          description: keyMoments.description,
          momentType: keyMoments.momentType,
          timestampSeconds: keyMoments.timestampSeconds,
          jerseyNumber: detectedPlayers.jerseyNumber,
          displayName: detectedPlayers.displayName,
        })
          .from(keyMoments)
          .innerJoin(detectedPlayers, eq(detectedPlayers.id, keyMoments.detectedPlayerId))
          .where(
            and(
              eq(detectedPlayers.gameId, latestReadyGame.id),
              eq(keyMoments.sentiment, 'negative')
            )
          )
          .orderBy(desc(keyMoments.createdAt))
          .limit(5)
      );
    }

    // Player development, stat leaders, focus areas, season progression - all depend on gameIds
    if (gameIds.length > 0) {
      // Player grades for development tracking
      queryKeys.push('playerGrades');
      parallelQueries.push(
        db.select({
          jerseyNumber: detectedPlayers.jerseyNumber,
          displayName: detectedPlayers.displayName,
          position: detectedPlayers.positionGuess,
          gameId: detectedPlayers.gameId,
          gameDate: games.createdAt,
          overallGrade: playerAnalysis.overallGrade,
          metrics: playerAnalysis.metrics,
          developmentAreas: playerAnalysis.developmentAreas,
        })
          .from(detectedPlayers)
          .innerJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
          .innerJoin(games, eq(games.id, detectedPlayers.gameId))
          .innerJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
          .where(
            and(
              inArray(detectedPlayers.gameId, gameIds),
              eq(detectedTeams.isUserTeam, true),
              isNotNull(playerAnalysis.overallGrade)
            )
          )
          .orderBy(desc(games.createdAt))
      );

      // Players with metrics for stat leaders
      queryKeys.push('playersWithMetrics');
      parallelQueries.push(
        db.select({
          jerseyNumber: detectedPlayers.jerseyNumber,
          displayName: detectedPlayers.displayName,
          metrics: playerAnalysis.metrics,
          gameId: detectedPlayers.gameId,
        })
          .from(detectedPlayers)
          .innerJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
          .innerJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
          .where(
            and(
              inArray(detectedPlayers.gameId, gameIds),
              eq(detectedTeams.isUserTeam, true),
              isNotNull(playerAnalysis.metrics)
            )
          )
      );

      // Development areas for practice focus
      queryKeys.push('recentAnalyses');
      parallelQueries.push(
        db.select({
          developmentAreas: playerAnalysis.developmentAreas,
        })
          .from(playerAnalysis)
          .innerJoin(detectedPlayers, eq(detectedPlayers.id, playerAnalysis.detectedPlayerId))
          .innerJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
          .innerJoin(games, eq(games.id, detectedPlayers.gameId))
          .where(
            and(
              inArray(detectedPlayers.gameId, gameIds),
              eq(detectedTeams.isUserTeam, true),
              isNotNull(playerAnalysis.developmentAreas)
            )
          )
          .orderBy(desc(games.createdAt))
          .limit(50)
      );

      // Season progression
      queryKeys.push('gameGrades');
      parallelQueries.push(
        db.select({
          gameId: games.id,
          gameDate: games.createdAt,
          gameName: games.name,
          avgGrade: sql<number>`AVG(${playerAnalysis.overallGrade})::numeric(5,2)`,
        })
          .from(games)
          .innerJoin(detectedPlayers, eq(detectedPlayers.gameId, games.id))
          .innerJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
          .innerJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
          .where(
            and(
              eq(games.userId, user.id),
              eq(detectedTeams.isUserTeam, true)
            )
          )
          .groupBy(games.id, games.createdAt, games.name)
          .orderBy(games.createdAt)
          .limit(10)
      );
    }

    // Execute all queries in parallel
    const results = await Promise.all(parallelQueries);

    // Process results by key
    const resultMap = new Map<string, any>();
    queryKeys.forEach((key, index) => {
      resultMap.set(key, results[index]);
    });

    // Process key moments
    if (resultMap.has('moments') && latestReadyGame) {
      const moments = resultMap.get('moments');
      recentMoments = moments.map((m: any) => ({
        id: m.id,
        description: m.description,
        momentType: m.momentType,
        sentiment: m.sentiment,
        timestamp: m.timestampSeconds ? formatTimestamp(parseFloat(m.timestampSeconds)) : null,
        timestampSeconds: m.timestampSeconds ? parseFloat(m.timestampSeconds) : null,
        player: m.displayName || `#${m.jerseyNumber}`,
        gameId: latestReadyGame.id,
      }));
    }

    // Process coaching insights
    if (resultMap.has('insights')) {
      const insightsResult = resultMap.get('insights');
      if (insightsResult[0]?.geminiAnalysis) {
        const analysis = insightsResult[0].geminiAnalysis as any;
        if (analysis.coachingInsights?.insights) {
          coachingInsights = analysis.coachingInsights.insights.slice(0, 3);
        } else if (analysis.teamScouting?.homeTeam?.tendencies) {
          coachingInsights = analysis.teamScouting.homeTeam.tendencies.slice(0, 3);
        } else if (analysis.gameFlow?.keyInsights) {
          coachingInsights = analysis.gameFlow.keyInsights.slice(0, 3);
        }
      }
    }

    // Process teaching moments
    if (resultMap.has('teaching') && latestReadyGame) {
      const negativeMoments = resultMap.get('teaching');
      teachingMoments = negativeMoments.map((m: any) => ({
        id: m.id,
        description: m.description,
        timestamp: m.timestampSeconds ? formatTimestamp(parseFloat(m.timestampSeconds)) : null,
        timestampSeconds: m.timestampSeconds ? parseFloat(m.timestampSeconds) : null,
        player: m.displayName || `#${m.jerseyNumber}`,
        gameId: latestReadyGame.id,
      }));
    }

    // Process player development from parallel query results
    if (resultMap.has('playerGrades')) {
      const playerGrades = resultMap.get('playerGrades');

      // Group by jersey number to calculate trends
      const playerMap = new Map<string, any[]>();
      for (const pg of playerGrades) {
        const key = pg.jerseyNumber?.toString() || 'unknown';
        if (!playerMap.has(key)) {
          playerMap.set(key, []);
        }
        playerMap.get(key)!.push(pg);
      }

      // Calculate trends for each player
      for (const [jerseyNumber, grades] of playerMap) {
        if (grades.length === 0) continue;

        const latestGrade = parseFloat(grades[0].overallGrade?.toString() || '0');
        const gradeHistory = grades.slice(0, 5).map((g: any) => ({
          grade: parseFloat(g.overallGrade?.toString() || '0'),
          date: g.gameDate?.toISOString(),
        })).reverse(); // Oldest first for chart display

        // Calculate trend (compare latest 2 vs previous 2)
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (grades.length >= 2) {
          const recent = grades.slice(0, Math.min(2, grades.length));
          const older = grades.slice(Math.min(2, grades.length), Math.min(4, grades.length));

          const recentAvg = recent.reduce((sum: number, g: any) => sum + parseFloat(g.overallGrade?.toString() || '0'), 0) / recent.length;
          const olderAvg = older.length > 0
            ? older.reduce((sum: number, g: any) => sum + parseFloat(g.overallGrade?.toString() || '0'), 0) / older.length
            : recentAvg;

          const diff = recentAvg - olderAvg;
          if (diff >= 3) trend = 'up';
          else if (diff <= -3) trend = 'down';
        }

        playerDevelopment.push({
          jerseyNumber,
          name: grades[0].displayName || `#${jerseyNumber}`,
          position: grades[0].position,
          currentGrade: latestGrade,
          gamesPlayed: grades.length,
          trend,
          gradeHistory,
          avgGrade: grades.reduce((sum: number, g: any) => sum + parseFloat(g.overallGrade?.toString() || '0'), 0) / grades.length,
        });
      }

      // Sort by current grade descending
      playerDevelopment.sort((a, b) => b.currentGrade - a.currentGrade);
    }

    // Process stat leaders from parallel query results
    if (resultMap.has('playersWithMetrics')) {
      const playersWithMetrics = resultMap.get('playersWithMetrics');

      // Aggregate stats per player
      const statsMap = new Map<string, { points: number; rebounds: number; assists: number; games: number; name: string }>();
      for (const p of playersWithMetrics) {
        const key = p.jerseyNumber?.toString() || 'unknown';
        const metrics = p.metrics as any;

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            points: 0,
            rebounds: 0,
            assists: 0,
            games: 0,
            name: p.displayName || `#${p.jerseyNumber}`
          });
        }

        const current = statsMap.get(key)!;
        current.points += metrics?.points || metrics?.totalPoints || 0;
        current.rebounds += metrics?.rebounds || metrics?.totalRebounds || 0;
        current.assists += metrics?.assists || 0;
        current.games++;
      }

      // Calculate per-game averages and get leaders
      const allStats = Array.from(statsMap.entries()).map(([jersey, stats]) => ({
        jerseyNumber: jersey,
        name: stats.name,
        ppg: stats.games > 0 ? stats.points / stats.games : 0,
        rpg: stats.games > 0 ? stats.rebounds / stats.games : 0,
        apg: stats.games > 0 ? stats.assists / stats.games : 0,
        totalPoints: stats.points,
        totalRebounds: stats.rebounds,
        totalAssists: stats.assists,
        games: stats.games,
      }));

      statLeaders = {
        points: [...allStats].sort((a, b) => b.ppg - a.ppg).slice(0, 3).map(s => ({
          jerseyNumber: s.jerseyNumber,
          name: s.name,
          value: s.ppg.toFixed(1),
          total: s.totalPoints,
        })),
        rebounds: [...allStats].sort((a, b) => b.rpg - a.rpg).slice(0, 3).map(s => ({
          jerseyNumber: s.jerseyNumber,
          name: s.name,
          value: s.rpg.toFixed(1),
          total: s.totalRebounds,
        })),
        assists: [...allStats].sort((a, b) => b.apg - a.apg).slice(0, 3).map(s => ({
          jerseyNumber: s.jerseyNumber,
          name: s.name,
          value: s.apg.toFixed(1),
          total: s.totalAssists,
        })),
      };
    }

    // Process practice focus areas from parallel query results
    if (resultMap.has('recentAnalyses')) {
      const recentAnalyses = resultMap.get('recentAnalyses');
      const focusAreaCounts = new Map<string, number>();

      for (const analysis of recentAnalyses) {
        const areas = analysis.developmentAreas as any;
        if (Array.isArray(areas)) {
          for (const area of areas) {
            const areaText = typeof area === 'string' ? area : area?.area || area?.description;
            if (areaText) {
              const normalized = normalizeDevArea(areaText);
              focusAreaCounts.set(normalized, (focusAreaCounts.get(normalized) || 0) + 1);
            }
          }
        }
      }

      practiceFocusAreas = Array.from(focusAreaCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([area, count]) => ({ area, playerCount: count }));
    }

    // Process season progression from parallel query results
    if (resultMap.has('gameGrades')) {
      const gameGrades = resultMap.get('gameGrades');
      seasonProgression = gameGrades
        .filter((g: any) => g.avgGrade !== null && parseFloat(g.avgGrade?.toString() || '0') > 0)
        .map((g: any) => ({
          gameId: g.gameId,
          date: g.gameDate?.toISOString(),
          name: g.gameName || 'Game',
          avgGrade: parseFloat(g.avgGrade?.toString() || '0'),
        }));
    }

    // === POSITION BREAKDOWN (computed from playerDevelopment) ===
    const positionStats: Record<string, { count: number; totalGrade: number; players: string[] }> = {};
    for (const player of playerDevelopment) {
      const pos = normalizePosition(player.position);
      if (!positionStats[pos]) {
        positionStats[pos] = { count: 0, totalGrade: 0, players: [] };
      }
      positionStats[pos].count++;
      positionStats[pos].totalGrade += player.currentGrade;
      positionStats[pos].players.push(player.name);
    }

    const positionBreakdown = Object.entries(positionStats).map(([position, stats]) => ({
      position,
      avgGrade: Math.round(stats.totalGrade / stats.count),
      playerCount: stats.count,
      players: stats.players.slice(0, 3),
    })).sort((a, b) => b.avgGrade - a.avgGrade);

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
      roster,
      sportsTeam: sportsTeamInfo
        ? {
            name: sportsTeamInfo.name,
            sport: sportsTeamInfo.sport,
            city: sportsTeamInfo.city,
            state: sportsTeamInfo.state,
            jerseyColorHome: sportsTeamInfo.jerseyColorHome,
          }
        : null,
      keyMoments: recentMoments,
      coachingInsights,
      // New enhanced data
      playerDevelopment,
      positionBreakdown,
      statLeaders,
      practiceFocusAreas,
      teachingMoments,
      seasonProgression,
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
      roster: [],
      sportsTeam: null,
      keyMoments: [],
      coachingInsights: [],
      playerDevelopment: [],
      positionBreakdown: [],
      statLeaders: { points: [], rebounds: [], assists: [] },
      practiceFocusAreas: [],
      teachingMoments: [],
      seasonProgression: [],
    });
  }
}
