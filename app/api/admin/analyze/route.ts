import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlays } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

/**
 * List Games for Analysis
 *
 * Returns games that have been annotated and are ready for play-by-play review
 */
export async function GET(request: NextRequest) {
  try {
    // Get games with annotation status 'reviewed' or better
    const gamesData = await db
      .select({
        id: games.id,
        name: games.name,
        title: games.title,
        sport: games.sport,
        status: games.status,
        annotationStatus: games.annotationStatus,
        createdAt: games.createdAt,
      })
      .from(games)
      .where(eq(games.annotationStatus, 'reviewed'))
      .orderBy(desc(games.createdAt));

    // Get play counts and reviewed counts for each game
    const gamesWithCounts = await Promise.all(
      gamesData.map(async (game) => {
        const plays = await db
          .select({
            id: detectedPlays.id,
            needsReview: detectedPlays.needsReview,
          })
          .from(detectedPlays)
          .where(eq(detectedPlays.gameId, game.id));

        const playCount = plays.length;
        // For now, consider plays without needsReview flag as reviewed
        const reviewedPlays = plays.filter(p => p.needsReview === false).length;

        return {
          id: game.id,
          name: game.name,
          title: game.title,
          sport: game.sport || 'unknown',
          status: game.status,
          annotationStatus: game.annotationStatus,
          playCount,
          reviewedPlays,
          createdAt: game.createdAt?.toISOString() || '',
        };
      })
    );

    return NextResponse.json({ games: gamesWithCounts });
  } catch (error) {
    console.error('Failed to fetch games for analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
