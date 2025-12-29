import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { isNotNull } from 'drizzle-orm';

export async function GET() {
  try {
    // Get games with geminiAnalysis that has humanReviewQueue
    // We ONLY use geminiAnalysis as the source of truth (not detectedPlays)
    // to avoid duplicates
    const gamesWithReview = await db
      .select({
        id: games.id,
        name: games.name,
        videoUrl: games.videoUrl,
        geminiAnalysis: games.geminiAnalysis,
      })
      .from(games)
      .where(isNotNull(games.geminiAnalysis));

    // Transform into the format the UI expects
    const gamesData = gamesWithReview
      .map((game) => {
        const analysis = game.geminiAnalysis as any;
        if (!analysis) return null;

        const humanReviewQueue = analysis.humanReviewQueue || [];
        const scoring = analysis.scoring || { home: 0, away: 0 };
        const officialBoxScore = analysis.officialBoxScore;
        const scoreDiscrepancy = analysis.scoreDiscrepancy;

        if (humanReviewQueue.length === 0 && !scoreDiscrepancy) return null;

        return {
          id: game.id,
          name: game.name || 'Untitled Game',
          videoUrl: game.videoUrl,
          homeScore: scoring.home,
          awayScore: scoring.away,
          officialBoxScore,
          scoreDiscrepancy,
          reviewCount: humanReviewQueue.length,
          events: humanReviewQueue.map((event: any, idx: number) => ({
            id: `${game.id}-${idx}`,
            gameId: game.id,
            gameName: game.name || 'Untitled Game',
            timestamp: event.timestamp,
            timestampSeconds: event.timestampSeconds,
            type: event.type,
            team: event.team,
            jersey: event.jersey,
            confidence: event.confidence,
            reason: event.reason,
            specialistConfidence: event.specialistConfidence,
            // Scoring event fields
            points: event.points,
            shotType: event.shotType,
          })),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ games: gamesData });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 });
  }
}
