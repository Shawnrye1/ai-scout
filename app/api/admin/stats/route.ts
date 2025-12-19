import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedPlays, corrections } from '@/lib/db/schema';
import { sql, eq, gte, and } from 'drizzle-orm';

export async function GET() {
  try {
    // Get counts
    const [gamesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(games)
      .where(eq(games.status, 'ready'));

    const [playersResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(detectedPlayers);

    // Get pending corrections (flagged plays)
    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(detectedPlays)
      .where(eq(detectedPlays.needsReview, true));

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayGames] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(games)
      .where(
        and(
          eq(games.status, 'ready'),
          gte(games.createdAt, today)
        )
      );

    // Get recent corrections count
    const [recentCorrections] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(corrections)
      .where(gte(corrections.createdAt, today));

    // Calculate average confidence from detected plays
    const [avgConfResult] = await db
      .select({ avg: sql<number>`COALESCE(AVG(confidence)::numeric(5,2), 0)` })
      .from(detectedPlays);

    // Get recent activity
    const recentPlays = await db
      .select({
        id: detectedPlays.id,
        playType: detectedPlays.playType,
        needsReview: detectedPlays.needsReview,
        createdAt: detectedPlays.createdAt,
      })
      .from(detectedPlays)
      .orderBy(sql`${detectedPlays.createdAt} DESC`)
      .limit(5);

    const recentActivity = recentPlays.map((play) => ({
      id: play.id,
      type: play.needsReview ? 'flagged' : 'processing',
      description: play.needsReview
        ? `Play flagged for review: ${play.playType || 'Unknown play'}`
        : `Play processed: ${play.playType || 'Unknown play'}`,
      timestamp: play.createdAt
        ? new Date(play.createdAt).toLocaleString()
        : 'Unknown',
    }));

    return NextResponse.json({
      stats: {
        pendingCorrections: pendingResult?.count || 0,
        gamesProcessed: gamesResult?.count || 0,
        totalPlayers: playersResult?.count || 0,
        avgConfidence: Math.round(avgConfResult?.avg || 85),
        recentCorrections: recentCorrections?.count || 0,
        processedToday: todayGames?.count || 0,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
