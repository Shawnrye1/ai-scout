import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sportsTeams, sportsTeamPlayers, detectedPlayers, games, playerAnalysis } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

// GET - Get a single player with all their details and game history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { playerId } = await params;
    const playerIdNum = parseInt(playerId);

    // Get player with team info
    const [player] = await db
      .select({
        id: sportsTeamPlayers.id,
        jerseyNumber: sportsTeamPlayers.jerseyNumber,
        name: sportsTeamPlayers.name,
        height: sportsTeamPlayers.height,
        weight: sportsTeamPlayers.weight,
        position: sportsTeamPlayers.position,
        yearGrade: sportsTeamPlayers.yearGrade,
        sportsTeamId: sportsTeamPlayers.sportsTeamId,
        createdAt: sportsTeamPlayers.createdAt,
        updatedAt: sportsTeamPlayers.updatedAt,
        teamName: sportsTeams.name,
        teamSport: sportsTeams.sport,
        teamCity: sportsTeams.city,
        teamState: sportsTeams.state,
        teamJerseyColorHome: sportsTeams.jerseyColorHome,
        teamJerseyColorAway: sportsTeams.jerseyColorAway,
      })
      .from(sportsTeamPlayers)
      .innerJoin(sportsTeams, eq(sportsTeamPlayers.sportsTeamId, sportsTeams.id))
      .where(eq(sportsTeamPlayers.id, playerIdNum))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Try to find game appearances for this player by matching jersey number + team
    // This connects roster players to detected players in games
    const gameAppearances = await db
      .select({
        gameId: games.id,
        gameName: games.name,
        gameDate: games.gameDate,
        opponent: games.opponent,
        detectedPlayerId: detectedPlayers.id,
        overallGrade: playerAnalysis.overallGrade,
        summary: playerAnalysis.summary,
      })
      .from(detectedPlayers)
      .innerJoin(games, eq(detectedPlayers.gameId, games.id))
      .leftJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
      .where(
        and(
          eq(detectedPlayers.jerseyNumber, player.jerseyNumber.toString()),
          // In the future, also match by team color or team ID
        )
      )
      .orderBy(sql`${games.gameDate} DESC NULLS LAST`)
      .limit(20);

    // Calculate aggregate stats from game appearances
    const gradesWithValues = gameAppearances
      .filter((g) => g.overallGrade !== null)
      .map((g) => parseFloat(g.overallGrade as string));

    const stats = {
      gamesPlayed: gameAppearances.length,
      averageGrade: gradesWithValues.length > 0
        ? gradesWithValues.reduce((a, b) => a + b, 0) / gradesWithValues.length
        : null,
      highestGrade: gradesWithValues.length > 0 ? Math.max(...gradesWithValues) : null,
      lowestGrade: gradesWithValues.length > 0 ? Math.min(...gradesWithValues) : null,
    };

    // Get all teams for the team transfer dropdown
    const allTeams = await db
      .select({
        id: sportsTeams.id,
        name: sportsTeams.name,
        sport: sportsTeams.sport,
      })
      .from(sportsTeams)
      .orderBy(sportsTeams.name);

    return NextResponse.json({
      player,
      gameAppearances,
      stats,
      allTeams,
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 });
  }
}
