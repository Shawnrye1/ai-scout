import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedTeams, playerAnalysis } from '@/lib/db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all players from user's games with their analysis
    const playersData = await db
      .select({
        id: detectedPlayers.id,
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
        positionGuess: detectedPlayers.positionGuess,
        gameId: detectedPlayers.gameId,
        teamName: detectedTeams.teamName,
        teamLabel: detectedTeams.teamLabel,
        gameName: games.name,
        gameTitle: games.title,
        gameDate: games.createdAt,
        overallGrade: playerAnalysis.overallGrade,
      })
      .from(detectedPlayers)
      .innerJoin(games, eq(games.id, detectedPlayers.gameId))
      .leftJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
      .leftJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
      .where(eq(games.userId, user.id))
      .orderBy(desc(games.createdAt));

    // Group by jersey number to aggregate across games
    const playerMap = new Map<string, {
      id: string;
      jerseyNumber: string;
      displayName: string | null;
      positionGuess: string | null;
      teamName: string;
      grades: number[];
      games: { gameId: string; gameName: string; grade: number; date: string }[];
    }>();

    for (const player of playersData) {
      const key = `${player.jerseyNumber}-${player.teamName || player.teamLabel}`;

      if (!playerMap.has(key)) {
        playerMap.set(key, {
          id: player.id,
          jerseyNumber: player.jerseyNumber || '??',
          displayName: player.displayName,
          positionGuess: player.positionGuess,
          teamName: player.teamName || player.teamLabel || 'Unknown',
          grades: [],
          games: [],
        });
      }

      const entry = playerMap.get(key)!;
      const grade = player.overallGrade ? parseFloat(player.overallGrade.toString()) : null;

      if (grade !== null) {
        entry.grades.push(grade);
      }

      entry.games.push({
        gameId: player.gameId,
        gameName: player.gameName || player.gameTitle || 'Game',
        grade: grade || 0,
        date: player.gameDate?.toISOString() || '',
      });

      // Use most recent display name if available
      if (player.displayName && !entry.displayName) {
        entry.displayName = player.displayName;
      }
      if (player.positionGuess && !entry.positionGuess) {
        entry.positionGuess = player.positionGuess;
      }
    }

    // Convert to array and calculate trends
    const players = Array.from(playerMap.values()).map((player) => {
      const avgGrade = player.grades.length > 0
        ? player.grades.reduce((a, b) => a + b, 0) / player.grades.length
        : null;

      // Calculate trend (last 2 games vs previous 2)
      let trend: 'up' | 'down' | 'stable' | null = null;
      if (player.grades.length >= 2) {
        const recent = player.grades.slice(0, 2);
        const previous = player.grades.slice(2, 4);
        if (previous.length > 0) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
          if (recentAvg > prevAvg + 3) trend = 'up';
          else if (recentAvg < prevAvg - 3) trend = 'down';
          else trend = 'stable';
        }
      }

      return {
        id: player.id,
        jerseyNumber: player.jerseyNumber,
        displayName: player.displayName,
        positionGuess: player.positionGuess,
        teamName: player.teamName,
        overallGrade: player.grades[0] || null,
        gamesPlayed: player.games.length,
        avgGrade,
        trend,
        recentGames: player.games.slice(0, 5),
      };
    });

    // Sort by average grade descending
    players.sort((a, b) => (b.avgGrade || 0) - (a.avgGrade || 0));

    return NextResponse.json({ players });
  } catch (error) {
    console.error('Players API error:', error);
    return NextResponse.json({ players: [] });
  }
}
