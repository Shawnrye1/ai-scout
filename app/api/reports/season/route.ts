import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedTeams, playerAnalysis, teams, sportsTeams, teamMembers } from '@/lib/db/schema';
import { eq, desc, and, inArray, isNotNull, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

function normalizeDevArea(area: string): string | null {
  const lower = area.toLowerCase();
  // Skip generic hand development suggestions - not useful for elite players
  if (lower.includes('left hand') || lower.includes('right hand')) return null;
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
  if (lower.includes('ball security') || lower.includes('turnover')) return 'Ball Security';
  return area.charAt(0).toUpperCase() + area.slice(1).toLowerCase();
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get team name through teamMembers
    const userTeamData = await db
      .select({
        teamName: teams.name,
        sportsTeamName: sportsTeams.name,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .leftJoin(sportsTeams, eq(sportsTeams.id, teams.sportsTeamId))
      .where(eq(teamMembers.userId, user.id))
      .limit(1);

    const teamName = userTeamData[0]?.sportsTeamName || userTeamData[0]?.teamName || 'Your Team';

    // Get user's team
    const teamMember = await db.query.teamMembers.findFirst({
      where: (tm, { eq }) => eq(tm.userId, user.id),
    });
    const teamId = teamMember?.teamId;
    if (!teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    // Get all games for this team
    const userGames = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.teamId, teamId));
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
          eq(games.teamId, teamId),
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
        tendencies: playerAnalysis.tendencies,
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
      displayName: string | null;
    }>();

    for (const ps of playerStats) {
      const key = ps.jerseyNumber || 'unknown';
      if (!playerMap.has(key)) {
        playerMap.set(key, { grades: [], points: 0, rebounds: 0, assists: 0, games: 0, devAreas: [], displayName: null });
      }
      const entry = playerMap.get(key)!;

      // Store display name if available
      if (ps.displayName && !entry.displayName) {
        entry.displayName = ps.displayName;
      }

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
            const normalized = normalizeDevArea(areaText);
            if (normalized) {
              entry.devAreas.push(normalized);
            }
          }
        }
      }

      // Extract from tendencies if no devAreas (only add Defense, skip hand suggestions)
      const tendencies = ps.tendencies as any;
      if (tendencies && entry.devAreas.length === 0) {
        if (tendencies.defensiveRating === 'average' || tendencies.defensiveRating === 'below average') {
          entry.devAreas.push('Defense');
        }
      }
    }

    // Calculate top players
    const topPlayers = Array.from(playerMap.entries())
      .map(([jersey, data]) => ({
        jerseyNumber: jersey,
        name: data.displayName || `#${jersey}`,
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
          name: data.displayName || `#${jersey}`,
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
      name: data.displayName || `#${jersey}`,
      ppg: data.games > 0 ? data.points / data.games : 0,
      rpg: data.games > 0 ? data.rebounds / data.games : 0,
      apg: data.games > 0 ? data.assists / data.games : 0,
    }));

    const pointsLeader = [...statLeadersData].sort((a, b) => b.ppg - a.ppg)[0];
    const reboundsLeader = [...statLeadersData].sort((a, b) => b.rpg - a.rpg)[0];
    const assistsLeader = [...statLeadersData].sort((a, b) => b.apg - a.apg)[0];

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
          name: pointsLeader?.name || '-',
          value: pointsLeader?.ppg || 0,
        },
        rebounds: {
          jerseyNumber: reboundsLeader?.jerseyNumber || '-',
          name: reboundsLeader?.name || '-',
          value: reboundsLeader?.rpg || 0,
        },
        assists: {
          jerseyNumber: assistsLeader?.jerseyNumber || '-',
          name: assistsLeader?.name || '-',
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
