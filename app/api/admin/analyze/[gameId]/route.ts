import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlays } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getDownloadPresignedUrl } from '@/lib/storage/r2';

/**
 * Get Game with Plays for Analysis
 *
 * Returns game info and all plays for play-by-play review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Get game info
    const [game] = await db
      .select({
        id: games.id,
        name: games.name,
        title: games.title,
        sport: games.sport,
        videoUrl: games.videoUrl,
        videoKey: games.videoKey,
        annotationStatus: games.annotationStatus,
      })
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Generate presigned URL for video
    let videoUrl = game.videoUrl;
    if (game.videoKey) {
      try {
        videoUrl = await getDownloadPresignedUrl(game.videoKey, 3600 * 4);
      } catch (e) {
        console.error('Failed to generate presigned URL:', e);
      }
    }

    // Get all plays ordered by play number
    const plays = await db
      .select({
        id: detectedPlays.id,
        playNumber: detectedPlays.playNumber,
        startTimestamp: detectedPlays.startTimestamp,
        endTimestamp: detectedPlays.endTimestamp,
        playType: detectedPlays.playType,
        needsReview: detectedPlays.needsReview,
      })
      .from(detectedPlays)
      .where(eq(detectedPlays.gameId, gameId))
      .orderBy(detectedPlays.playNumber);

    const formattedPlays = plays.map(p => ({
      id: p.id,
      playNumber: p.playNumber,
      startTimestamp: parseFloat(p.startTimestamp?.toString() || '0'),
      endTimestamp: parseFloat(p.endTimestamp?.toString() || '0'),
      playType: p.playType,
      reviewed: p.needsReview === false,
      approved: p.needsReview === false ? true : null, // If reviewed, assume approved for now
    }));

    return NextResponse.json({
      game: {
        id: game.id,
        name: game.name,
        title: game.title,
        sport: game.sport,
        videoUrl,
        annotationStatus: game.annotationStatus,
      },
      plays: formattedPlays,
    });
  } catch (error) {
    console.error('Failed to fetch game for analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}
