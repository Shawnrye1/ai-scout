import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, corrections, detectedPlays } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const filter = request.nextUrl.searchParams.get('filter') || 'all';

  try {
    const activities: any[] = [];

    // Get recent game processing events
    if (filter === 'all' || filter === 'game_processed') {
      const recentGames = await db
        .select({
          id: games.id,
          name: games.name,
          title: games.title,
          status: games.status,
          createdAt: games.createdAt,
          updatedAt: games.updatedAt,
        })
        .from(games)
        .where(eq(games.status, 'ready'))
        .orderBy(desc(games.updatedAt))
        .limit(10);

      for (const game of recentGames) {
        activities.push({
          id: `game-${game.id}`,
          type: 'game_processed',
          description: 'Game processing completed',
          details: game.name || game.title || 'Untitled Game',
          timestamp: game.updatedAt?.toISOString() || game.createdAt?.toISOString(),
        });
      }
    }

    // Get recent corrections
    if (filter === 'all' || filter === 'correction_made') {
      const recentCorrections = await db
        .select({
          id: corrections.id,
          correctionType: corrections.correctionType,
          correctedBy: corrections.correctedBy,
          notes: corrections.notes,
          createdAt: corrections.createdAt,
        })
        .from(corrections)
        .orderBy(desc(corrections.createdAt))
        .limit(10);

      for (const correction of recentCorrections) {
        activities.push({
          id: `correction-${correction.id}`,
          type: 'correction_made',
          description: `${correction.correctionType || 'Item'} corrected`,
          details: correction.notes || undefined,
          user: correction.correctedBy || 'Admin',
          timestamp: correction.createdAt?.toISOString(),
        });
      }
    }

    // Get flagged items
    if (filter === 'all' || filter === 'flagged') {
      const flaggedPlays = await db
        .select({
          id: detectedPlays.id,
          playType: detectedPlays.playType,
          flagReason: detectedPlays.flagReason,
          createdAt: detectedPlays.createdAt,
        })
        .from(detectedPlays)
        .where(eq(detectedPlays.needsReview, true))
        .orderBy(desc(detectedPlays.createdAt))
        .limit(10);

      for (const play of flaggedPlays) {
        activities.push({
          id: `flag-${play.id}`,
          type: 'flagged',
          description: 'Play flagged for review',
          details: play.flagReason || play.playType || 'Unknown play',
          user: 'Coach',
          timestamp: play.createdAt?.toISOString(),
        });
      }
    }

    // Sort by timestamp
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ activities: activities.slice(0, 50) });
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    return NextResponse.json({ activities: [] });
  }
}
