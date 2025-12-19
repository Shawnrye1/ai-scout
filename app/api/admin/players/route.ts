import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlayers, detectedTeams, games, playerAnalysis } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const players = await db
      .select({
        id: detectedPlayers.id,
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
        positionGuess: detectedPlayers.positionGuess,
        framesVisible: detectedPlayers.framesVisible,
        gameId: detectedPlayers.gameId,
        teamName: detectedTeams.teamName,
        teamLabel: detectedTeams.teamLabel,
        gameName: games.name,
        gameTitle: games.title,
        overallGrade: playerAnalysis.overallGrade,
      })
      .from(detectedPlayers)
      .leftJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
      .leftJoin(games, eq(games.id, detectedPlayers.gameId))
      .leftJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
      .orderBy(desc(games.createdAt));

    const formattedPlayers = players.map((p) => ({
      id: p.id,
      jerseyNumber: p.jerseyNumber || '??',
      displayName: p.displayName,
      positionGuess: p.positionGuess,
      framesVisible: p.framesVisible,
      gameId: p.gameId,
      teamName: p.teamName || p.teamLabel || 'Unknown Team',
      gameName: p.gameName || p.gameTitle || 'Untitled Game',
      overallGrade: p.overallGrade ? parseFloat(p.overallGrade) : null,
    }));

    return NextResponse.json({ players: formattedPlayers });
  } catch (error) {
    console.error('Failed to fetch players:', error);
    return NextResponse.json({ players: [] });
  }
}
