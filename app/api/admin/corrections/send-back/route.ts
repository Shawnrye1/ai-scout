import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Send Back to Segmentation API
 *
 * Moves a play from the Analysis queue back to the Segmentation queue.
 * Used when a user discovers that a play still contains multiple plays
 * and needs to be re-segmented.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playId } = body;

    if (!playId) {
      return NextResponse.json(
        { error: 'playId is required' },
        { status: 400 }
      );
    }

    // Lower the confidence so it appears back in the segmentation queue
    // The segmentation queue shows plays with confidence < 0.85
    await db
      .update(detectedPlays)
      .set({
        confidence: '0.50', // Low confidence triggers segmentation review
        needsReview: true,
        playType: null, // Clear any play type since boundaries are wrong
      })
      .where(eq(detectedPlays.id, playId));

    return NextResponse.json({
      success: true,
      message: 'Play sent back to segmentation queue',
    });
  } catch (error) {
    console.error('Failed to send play back:', error);
    return NextResponse.json(
      { error: 'Failed to send play back' },
      { status: 500 }
    );
  }
}
