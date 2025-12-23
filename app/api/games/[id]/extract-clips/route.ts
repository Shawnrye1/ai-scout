import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlays } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { extractVideoClipsBatch } from '@/lib/video/clip-extractor';

/**
 * POST /api/games/[id]/extract-clips
 *
 * Extract video clips for all plays in a game.
 * Called automatically after Modal processes a video.
 *
 * Uses batch extraction (downloads video ONCE, extracts all clips).
 * This is much faster than extracting clips one by one.
 *
 * Clips are stored at: clips/{gameId}/{playId}.mp4
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id: gameId } = await params;

  try {
    console.log(`[Extract Clips] Starting batch clip extraction for game ${gameId}`);

    // Get game info
    const [game] = await db
      .select({
        id: games.id,
        videoKey: games.videoKey,
      })
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game.videoKey) {
      return NextResponse.json({ error: 'No video available for this game' }, { status: 400 });
    }

    // Get all plays for this game
    const plays = await db
      .select({
        id: detectedPlays.id,
        playNumber: detectedPlays.playNumber,
        startTimestamp: detectedPlays.startTimestamp,
        endTimestamp: detectedPlays.endTimestamp,
      })
      .from(detectedPlays)
      .where(eq(detectedPlays.gameId, gameId));

    console.log(`[Extract Clips] Found ${plays.length} plays for game ${gameId}`);

    if (plays.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No plays to extract clips for',
        extracted: 0,
        skipped: 0,
      });
    }

    // Prepare clips for batch extraction
    const clips = plays.map(play => ({
      playId: play.id,
      startTime: parseFloat(play.startTimestamp?.toString() || '0'),
      endTime: parseFloat(play.endTimestamp?.toString() || '0'),
    }));

    // Batch extract all clips (downloads video once, extracts all)
    const result = await extractVideoClipsBatch({
      videoKey: game.videoKey,
      gameId: gameId,
      clips,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Extract Clips] Completed in ${duration}s: ${result.successful.length} extracted, ${result.skipped.length} skipped, ${result.failed.length} failed`);

    return NextResponse.json({
      success: true,
      gameId,
      extracted: result.successful.length,
      skipped: result.skipped.length,
      failed: result.failed.length,
      total: plays.length,
      durationSeconds: parseFloat(duration),
      errors: result.failed.length > 0 ? result.failed.map(f => `Play ${f.playId}: ${f.error}`) : undefined,
    });
  } catch (error) {
    console.error('[Extract Clips] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract clips' },
      { status: 500 }
    );
  }
}
