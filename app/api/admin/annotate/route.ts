import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlays } from '@/lib/db/schema';
import { eq, sql, desc, or, inArray } from 'drizzle-orm';

/**
 * List Games for Annotation API
 *
 * Returns games with their play counts and coverage statistics
 * for the full-game annotation workflow.
 */

export async function GET(request: NextRequest) {
  try {
    // Get all games with status 'ready' or 'uploaded' (awaiting annotation)
    const gamesWithStats = await db
      .select({
        id: games.id,
        name: games.name,
        title: games.title,
        sport: games.sport,
        status: games.status,
        videoDuration: games.videoDurationSeconds,
        annotationStatus: games.annotationStatus,
        createdAt: games.createdAt,
      })
      .from(games)
      .where(
        or(
          eq(games.status, 'ready'),
          eq(games.status, 'uploaded')
        )
      )
      .orderBy(desc(games.createdAt));

    // For each game, get play count and calculate coverage
    const gamesWithCoverage = await Promise.all(
      gamesWithStats.map(async (game) => {
        const plays = await db
          .select({
            startTimestamp: detectedPlays.startTimestamp,
            endTimestamp: detectedPlays.endTimestamp,
          })
          .from(detectedPlays)
          .where(eq(detectedPlays.gameId, game.id))
          .orderBy(sql`CAST(${detectedPlays.startTimestamp} AS DECIMAL)`);

        const playCount = plays.length;

        // Calculate coverage
        let coveredTime = 0;
        let gapsCount = 0;

        for (let i = 0; i < plays.length; i++) {
          const start = parseFloat(plays[i].startTimestamp?.toString() || '0');
          const end = parseFloat(plays[i].endTimestamp?.toString() || '0');
          coveredTime += end - start;

          // Check for gap to next play
          if (i < plays.length - 1) {
            const nextStart = parseFloat(plays[i + 1].startTimestamp?.toString() || '0');
            if (nextStart - end > 0.5) {
              gapsCount++;
            }
          }
        }

        const videoDuration = game.videoDuration || 0;
        const coveragePercentage = videoDuration > 0
          ? Math.round((coveredTime / videoDuration) * 100)
          : (playCount > 0 ? 100 : 0);

        return {
          id: game.id,
          name: game.name,
          title: game.title,
          sport: game.sport || 'unknown',
          status: game.status, // Include game status
          videoDuration: videoDuration,
          playCount,
          gapsCount,
          coveragePercentage,
          annotationStatus: game.annotationStatus || 'pending',
          createdAt: game.createdAt?.toISOString() || '',
        };
      })
    );

    // Calculate statistics
    const statistics = {
      totalPending: gamesWithCoverage.filter(g => g.annotationStatus === 'pending').length,
      totalInProgress: gamesWithCoverage.filter(g => g.annotationStatus === 'in_progress').length,
      totalReviewed: gamesWithCoverage.filter(g => g.annotationStatus === 'reviewed').length,
    };

    return NextResponse.json({
      games: gamesWithCoverage,
      statistics,
    });
  } catch (error) {
    console.error('Failed to fetch games for annotation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
