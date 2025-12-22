import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Update Play Review Status
 *
 * PATCH /api/admin/analyze/[gameId]/plays/[playId]
 * Body: { reviewed: boolean, approved: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; playId: string }> }
) {
  try {
    const { playId } = await params;
    const body = await request.json();
    const { reviewed, approved } = body;

    // Update the play's review status
    // needsReview = false means it has been reviewed
    await db
      .update(detectedPlays)
      .set({
        needsReview: reviewed ? false : true,
        updatedAt: new Date(),
      })
      .where(eq(detectedPlays.id, playId));

    return NextResponse.json({
      success: true,
      playId,
      reviewed,
      approved,
    });
  } catch (error) {
    console.error('Failed to update play:', error);
    return NextResponse.json(
      { error: 'Failed to update play' },
      { status: 500 }
    );
  }
}
