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

    // Get user's team and linked sports team roster
    const userTeam = await db
      .select()
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, user.id))
      .limit(1);

    let roster: any[] = [];
    let sportsTeamInfo: any = null;

    if (userTeam.length > 0 && userTeam[0].teams.sportsTeamId) {
      const sportsTeamId = userTeam[0].teams.sportsTeamId;

      // Get sports team info
      const [teamInfo] = await db
        .select()
        .from(sportsTeams)
        .where(eq(sportsTeams.id, sportsTeamId));

      sportsTeamInfo = teamInfo;

      // Get roster
      const rosterData = await db
        .select()
        .from(sportsTeamPlayers)
        .where(eq(sportsTeamPlayers.sportsTeamId, sportsTeamId))
        .orderBy(sportsTeamPlayers.jerseyNumber);

      roster = rosterData.map((p) => ({
        id: p.id,
        jerseyNumber: p.jerseyNumber,
        name: p.name,
        position: p.position,
        height: p.height,
        yearGrade: p.yearGrade,
      }));
    }

    // Get key moments from latest completed game
    let recentMoments: any[] = [];
    const latestReadyGame = recentGames.find((g) => g.status === 'ready');

    if (latestReadyGame) {
      const moments = await db
        .select({
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
        .limit(5);

      recentMoments = moments.map((m) => ({
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

    // Extract coaching insights from latest game's Gemini analysis
    let coachingInsights: string[] = [];
    if (latestReadyGame) {
      const [gameWithAnalysis] = await db
        .select({ geminiAnalysis: games.geminiAnalysis })
        .from(games)
        .where(eq(games.id, latestReadyGame.id));

      if (gameWithAnalysis?.geminiAnalysis) {
        const analysis = gameWithAnalysis.geminiAnalysis as any;
        // Extract insights from various Gemini analysis sections
        if (analysis.coachingInsights?.insights) {
          coachingInsights = analysis.coachingInsights.insights.slice(0, 3);
        } else if (analysis.teamScouting?.homeTeam?.tendencies) {
          coachingInsights = analysis.teamScouting.homeTeam.tendencies.slice(0, 3);
        } else if (analysis.gameFlow?.keyInsights) {
          coachingInsights = analysis.gameFlow.keyInsights.slice(0, 3);
        }
      }
    }

    // === PLAYER DEVELOPMENT TRACKING ===
    // Get player grades across multiple games for trend analysis
    let playerDevelopment: any[] = [];
    if (gameIds.length > 0) {
      // Get all players with their grades per game
      const playerGrades = await db
        .select({
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
        .orderBy(desc(games.createdAt));

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
        const gradeHistory = grades.slice(0, 5).map(g => ({
          grade: parseFloat(g.overallGrade?.toString() || '0'),
          date: g.gameDate?.toISOString(),
        })).reverse(); // Oldest first for chart display

        // Calculate trend (compare latest 2 vs previous 2)
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (grades.length >= 2) {
          const recent = grades.slice(0, Math.min(2, grades.length));
          const older = grades.slice(Math.min(2, grades.length), Math.min(4, grades.length));

          const recentAvg = recent.reduce((sum, g) => sum + parseFloat(g.overallGrade?.toString() || '0'), 0) / recent.length;
          const olderAvg = older.length > 0
            ? older.reduce((sum, g) => sum + parseFloat(g.overallGrade?.toString() || '0'), 0) / older.length
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
          avgGrade: grades.reduce((sum, g) => sum + parseFloat(g.overallGrade?.toString() || '0'), 0) / grades.length,
        });
      }

      // Sort by current grade descending
      playerDevelopment.sort((a, b) => b.currentGrade - a.currentGrade);
    }

    // === POSITION BREAKDOWN ===
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

    // === STAT LEADERS ===
    // Extract stats from playerAnalysis.metrics
    let statLeaders: any = { points: [], rebounds: [], assists: [] };
    if (gameIds.length > 0) {
      const playersWithMetrics = await db
        .select({
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
        );

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
        points: allStats.sort((a, b) => b.ppg - a.ppg).slice(0, 3).map(s => ({
          jerseyNumber: s.jerseyNumber,
          name: s.name,
          value: s.ppg.toFixed(1),
          total: s.totalPoints,
        })),
        rebounds: allStats.sort((a, b) => b.rpg - a.rpg).slice(0, 3).map(s => ({
          jerseyNumber: s.jerseyNumber,
          name: s.name,
          value: s.rpg.toFixed(1),
          total: s.totalRebounds,
        })),
        assists: allStats.sort((a, b) => b.apg - a.apg).slice(0, 3).map(s => ({
          jerseyNumber: s.jerseyNumber,
          name: s.name,
          value: s.apg.toFixed(1),
          total: s.totalAssists,
        })),
      };
    }

    // === PRACTICE FOCUS AREAS ===
    // Aggregate development areas from all recent player analyses
    const focusAreaCounts = new Map<string, number>();
    if (gameIds.length > 0) {
      const recentAnalyses = await db
        .select({
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
        .limit(50);

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
    }

    const practiceFocusAreas = Array.from(focusAreaCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area, count]) => ({ area, playerCount: count }));

    // === TEACHING MOMENTS (for film sessions) ===
    let teachingMoments: any[] = [];
    if (latestReadyGame) {
      const negativeMoments = await db
        .select({
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
        .limit(5);

      teachingMoments = negativeMoments.map((m) => ({
        id: m.id,
        description: m.description,
        timestamp: m.timestampSeconds ? formatTimestamp(parseFloat(m.timestampSeconds)) : null,
        timestampSeconds: m.timestampSeconds ? parseFloat(m.timestampSeconds) : null,
        player: m.displayName || `#${m.jerseyNumber}`,
        gameId: latestReadyGame.id,
      }));
    }

    // === SEASON PROGRESSION ===
    // Calculate team average grade per game over time
    let seasonProgression: any[] = [];
    if (gameIds.length > 0) {
      const gameGrades = await db
        .select({
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
        .limit(10);

      seasonProgression = gameGrades
        .filter((g) => g.avgGrade !== null && parseFloat(g.avgGrade?.toString() || '0') > 0)
        .map((g) => ({
          gameId: g.gameId,
          date: g.gameDate?.toISOString(),
          name: g.gameName || 'Game',
          avgGrade: parseFloat(g.avgGrade?.toString() || '0'),
        }));
    }

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
