import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedPlays } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const allGames = await db
      .select({
        id: games.id,
        name: games.name,
        title: games.title,
        sport: games.sport,
        status: games.status,
        opponent: games.opponent,
        createdAt: games.createdAt,
      })
      .from(games)
      .orderBy(desc(games.createdAt));

    // Get player and play counts for each game
    const gamesWithCounts = await Promise.all(
      allGames.map(async (game) => {
        const [playerCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(detectedPlayers)
          .where(eq(detectedPlayers.gameId, game.id));

        const [playCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(detectedPlays)
          .where(eq(detectedPlays.gameId, game.id));

        return {
          ...game,
          playerCount: playerCount?.count || 0,
          playCount: playCount?.count || 0,
        };
      })
    );

    return NextResponse.json({ games: gamesWithCounts });
  } catch (error) {
    console.error('Failed to fetch games:', error);
    return NextResponse.json({ games: [] });
  }
}
