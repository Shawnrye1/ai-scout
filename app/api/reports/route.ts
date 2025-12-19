import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedTeams, detectedPlayers, playerAnalysis, teamAnalysis } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all teams from user's games
    const teamsData = await db
      .select({
        id: detectedTeams.id,
        teamName: detectedTeams.teamName,
        teamLabel: detectedTeams.teamLabel,
        primaryColor: detectedTeams.primaryJerseyColor,
        isUserTeam: detectedTeams.isUserTeam,
        gameId: detectedTeams.gameId,
        gameName: games.name,
        gameTitle: games.title,
        gameDate: games.createdAt,
        formationBreakdown: teamAnalysis.formationBreakdown,
        playTypeBreakdown: teamAnalysis.playTypeBreakdown,
        tendencies: teamAnalysis.tendencies,
        tendenciesReport: teamAnalysis.tendenciesReport,
      })
      .from(detectedTeams)
      .innerJoin(games, eq(games.id, detectedTeams.gameId))
      .leftJoin(teamAnalysis, eq(teamAnalysis.detectedTeamId, detectedTeams.id))
      .where(eq(games.userId, user.id))
      .orderBy(desc(games.createdAt));

    // Group teams by name
    const teamMap = new Map<string, {
      id: string;
      teamName: string;
      teamLabel: string;
      primaryColor: string;
      isUserTeam: boolean;
      formationBreakdown: Record<string, number>;
      playTypeBreakdown: Record<string, number>;
      tendencies: string[];
      games: { id: string; name: string; date: string }[];
    }>();

    for (const team of teamsData) {
      const key = team.teamName || team.teamLabel || team.id;

      if (!teamMap.has(key)) {
        teamMap.set(key, {
          id: team.id,
          teamName: team.teamName || '',
          teamLabel: team.teamLabel || '',
          primaryColor: team.primaryColor || '#0f2d52',
          isUserTeam: team.isUserTeam || false,
          formationBreakdown: {},
          playTypeBreakdown: {},
          tendencies: [],
          games: [],
        });
      }

      const entry = teamMap.get(key)!;

      // Merge formation breakdowns
      if (team.formationBreakdown) {
        const fb = team.formationBreakdown as Record<string, number>;
        for (const [formation, pct] of Object.entries(fb)) {
          entry.formationBreakdown[formation] = (entry.formationBreakdown[formation] || 0) + pct;
        }
      }

      // Merge play type breakdowns
      if (team.playTypeBreakdown) {
        const ptb = team.playTypeBreakdown as Record<string, number>;
        for (const [playType, count] of Object.entries(ptb)) {
          entry.playTypeBreakdown[playType] = (entry.playTypeBreakdown[playType] || 0) + count;
        }
      }

      // Add tendencies
      if (team.tendenciesReport) {
        entry.tendencies.push(team.tendenciesReport);
      }

      entry.games.push({
        id: team.gameId,
        name: team.gameName || team.gameTitle || 'Game',
        date: team.gameDate?.toISOString() || '',
      });
    }

    // Get player counts and avg grades for each team
    const teams = await Promise.all(
      Array.from(teamMap.entries()).map(async ([, team]) => {
        // Get player count
        const [playerCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(detectedPlayers)
          .where(eq(detectedPlayers.detectedTeamId, team.id));

        // Get average grade
        const [avgGradeResult] = await db
          .select({ avg: sql<number>`COALESCE(AVG(${playerAnalysis.overallGrade})::numeric(5,2), 0)` })
          .from(playerAnalysis)
          .innerJoin(detectedPlayers, eq(detectedPlayers.id, playerAnalysis.detectedPlayerId))
          .where(eq(detectedPlayers.detectedTeamId, team.id));

        // Normalize formation breakdown percentages
        const totalFormations = Object.values(team.formationBreakdown).reduce((a, b) => a + b, 0);
        const normalizedFormations: Record<string, number> = {};
        for (const [formation, count] of Object.entries(team.formationBreakdown)) {
          normalizedFormations[formation] = Math.round((count / totalFormations) * 100);
        }

        return {
          id: team.id,
          teamName: team.teamName,
          teamLabel: team.teamLabel,
          primaryColor: team.primaryColor,
          isUserTeam: team.isUserTeam,
          gamesPlayed: team.games.length,
          playerCount: playerCount?.count || 0,
          avgGrade: parseFloat(avgGradeResult?.avg?.toString() || '75'),
          formationBreakdown: normalizedFormations,
          playTypeBreakdown: team.playTypeBreakdown,
          tendencies: team.tendencies.slice(0, 5),
          recentGames: team.games.slice(0, 3),
        };
      })
    );

    // Sort: user's team first, then by games played
    teams.sort((a, b) => {
      if (a.isUserTeam && !b.isUserTeam) return -1;
      if (!a.isUserTeam && b.isUserTeam) return 1;
      return b.gamesPlayed - a.gamesPlayed;
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ teams: [] });
  }
}
