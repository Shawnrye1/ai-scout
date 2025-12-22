import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { triggerModalProcessing } from '@/lib/processing/modal';
import { getDownloadPresignedUrl } from '@/lib/storage/r2';

/**
 * POST /api/games/[id]/process
 *
 * Trigger ML processing for a game after annotation is complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    // Get game info
    const [game] = await db
      .select({
        id: games.id,
        videoUrl: games.videoUrl,
        videoKey: games.videoKey,
        sport: games.sport,
        status: games.status,
      })
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get download URL for the video
    let videoUrl = game.videoUrl;
    if (game.videoKey) {
      try {
        videoUrl = await getDownloadPresignedUrl(game.videoKey, 3600 * 4); // 4 hour expiry
      } catch (e) {
        console.error('Failed to generate presigned URL:', e);
      }
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'No video URL available' }, { status: 400 });
    }

    // Update game status to queued
    await db
      .update(games)
      .set({
        status: 'queued',
        processingProgress: 0,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    // Trigger Modal processing
    await triggerModalProcessing({
      gameId: game.id,
      videoUrl,
      sport: game.sport || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Processing started',
    });
  } catch (error) {
    console.error('Failed to trigger processing:', error);
    return NextResponse.json(
      { error: 'Failed to trigger processing' },
      { status: 500 }
    );
  }
}
