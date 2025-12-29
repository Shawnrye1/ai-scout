import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedTeams, playerAnalysis, teams, sportsTeams } from '@/lib/db/schema';
import { eq, desc, and, inArray, isNotNull, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

function normalizeDevArea(area: string): string {
  const lower = area.toLowerCase();
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
  return area.charAt(0).toUpperCase() + area.slice(1).toLowerCase();
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get team name
    const userTeamData = await db
      .select({
        teamName: teams.name,
        sportsTeamName: sportsTeams.name,
      })
      .from(teams)
      .leftJoin(sportsTeams, eq(sportsTeams.id, teams.sportsTeamId))
      .where(eq(teams.userId, user.id))
      .limit(1);

    const teamName = userTeamData[0]?.sportsTeamName || userTeamData[0]?.teamName || 'Your Team';

    // Get all games for this user
    const userGames = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.userId, user.id));
    const gameIds = userGames.map((g) => g.id);

    if (gameIds.length === 0) {
      return NextResponse.json({
        report: {
          teamName,
          gamesPlayed: 0,
          avgGrade: 0,
          gradeProgression: [],
          topPlayers: [],
          improvingPlayers: [],
          focusAreas: [],
          statLeaders: {
            points: { jerseyNumber: '-', value: 0 },
            rebounds: { jerseyNumber: '-', value: 0 },
            assists: { jerseyNumber: '-', value: 0 },
          },
        },
      });
    }

    // Get grade progression per game
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
      .limit(20);

    const gradeProgression = gameGrades
      .filter((g) => g.avgGrade !== null)
      .map((g) => ({
        date: g.gameDate?.toISOString() || '',
        grade: parseFloat(g.avgGrade?.toString() || '0'),
        gameName: g.gameName || 'Game',
      }));

    const avgGrade = gradeProgression.length > 0
      ? gradeProgression.reduce((sum, g) => sum + g.grade, 0) / gradeProgression.length
      : 0;

    // Get player stats aggregated
    const playerStats = await db
      .select({
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
        gameId: detectedPlayers.gameId,
        overallGrade: playerAnalysis.overallGrade,
        metrics: playerAnalysis.metrics,
        developmentAreas: playerAnalysis.developmentAreas,
      })
      .from(detectedPlayers)
      .innerJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
      .innerJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
      .where(
        and(
          inArray(detectedPlayers.gameId, gameIds),
          eq(detectedTeams.isUserTeam, true),
          isNotNull(playerAnalysis.overallGrade)
        )
      );

    // Aggregate by player
    const playerMap = new Map<string, {
      grades: number[];
      points: number;
      rebounds: number;
      assists: number;
      games: number;
      devAreas: string[];
    }>();

    for (const ps of playerStats) {
      const key = ps.jerseyNumber || 'unknown';
      if (!playerMap.has(key)) {
        playerMap.set(key, { grades: [], points: 0, rebounds: 0, assists: 0, games: 0, devAreas: [] });
      }
      const entry = playerMap.get(key)!;

      if (ps.overallGrade) {
        entry.grades.push(parseFloat(ps.overallGrade.toString()));
      }

      const metrics = ps.metrics as any;
      if (metrics) {
        entry.points += metrics.points || metrics.totalPoints || 0;
        entry.rebounds += metrics.rebounds || metrics.totalRebounds || 0;
        entry.assists += metrics.assists || 0;
      }

      entry.games++;

      const devAreas = ps.developmentAreas as any;
      if (Array.isArray(devAreas)) {
        for (const area of devAreas) {
          const areaText = typeof area === 'string' ? area : area?.area || area?.description;
          if (areaText) {
            entry.devAreas.push(normalizeDevArea(areaText));
          }
        }
      }
    }

    // Calculate top players
    const topPlayers = Array.from(playerMap.entries())
      .map(([jersey, data]) => ({
        jerseyNumber: jersey,
        name: `#${jersey}`,
        avgGrade: data.grades.length > 0
          ? data.grades.reduce((a, b) => a + b, 0) / data.grades.length
          : 0,
        gamesPlayed: data.games,
      }))
      .sort((a, b) => b.avgGrade - a.avgGrade)
      .slice(0, 10);

    // Calculate improving players (trend)
    const improvingPlayers = Array.from(playerMap.entries())
      .map(([jersey, data]) => {
        if (data.grades.length < 2) return null;
        const recent = data.grades.slice(0, 2);
        const older = data.grades.slice(2, 4);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.length > 0
          ? older.reduce((a, b) => a + b, 0) / older.length
          : recentAvg;
        return {
          jerseyNumber: jersey,
          name: `#${jersey}`,
          trend: recentAvg - olderAvg,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null && p.trend >= 3)
      .sort((a, b) => b.trend - a.trend)
      .slice(0, 5);

    // Calculate focus areas
    const focusAreaCounts = new Map<string, number>();
    for (const [, data] of playerMap) {
      for (const area of data.devAreas) {
        focusAreaCounts.set(area, (focusAreaCounts.get(area) || 0) + 1);
      }
    }
    const focusAreas = Array.from(focusAreaCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area, count]) => ({ area, playerCount: count }));

    // Calculate stat leaders
    const statLeadersData = Array.from(playerMap.entries()).map(([jersey, data]) => ({
      jerseyNumber: jersey,
      ppg: data.games > 0 ? data.points / data.games : 0,
      rpg: data.games > 0 ? data.rebounds / data.games : 0,
      apg: data.games > 0 ? data.assists / data.games : 0,
    }));

    const pointsLeader = statLeadersData.sort((a, b) => b.ppg - a.ppg)[0];
    const reboundsLeader = statLeadersData.sort((a, b) => b.rpg - a.rpg)[0];
    const assistsLeader = statLeadersData.sort((a, b) => b.apg - a.apg)[0];

    const report = {
      teamName,
      gamesPlayed: gradeProgression.length,
      avgGrade,
      gradeProgression,
      topPlayers,
      improvingPlayers,
      focusAreas,
      statLeaders: {
        points: {
          jerseyNumber: pointsLeader?.jerseyNumber || '-',
          value: pointsLeader?.ppg || 0,
        },
        rebounds: {
          jerseyNumber: reboundsLeader?.jerseyNumber || '-',
          value: reboundsLeader?.rpg || 0,
        },
        assists: {
          jerseyNumber: assistsLeader?.jerseyNumber || '-',
          value: assistsLeader?.apg || 0,
        },
      },
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Season report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
