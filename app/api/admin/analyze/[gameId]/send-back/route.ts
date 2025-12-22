import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Send Game Back to Annotation
 *
 * POST /api/admin/analyze/[gameId]/send-back
 * Resets the game's annotation status so it appears in the annotation queue again
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Reset annotation status to pending so it goes back to annotation queue
    await db
      .update(games)
      .set({
        annotationStatus: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    return NextResponse.json({
      success: true,
      message: 'Game sent back to annotation queue',
    });
  } catch (error) {
    console.error('Failed to send game back:', error);
    return NextResponse.json(
      { error: 'Failed to send game back' },
      { status: 500 }
    );
  }
}
