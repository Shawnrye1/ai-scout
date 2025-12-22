import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Mark Annotation as Complete
 *
 * POST /api/admin/annotate/[gameId]/complete
 * Sets annotationStatus to 'reviewed' so the game appears in the Analyze queue
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Update game annotation status to reviewed
    await db
      .update(games)
      .set({
        annotationStatus: 'reviewed',
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    return NextResponse.json({
      success: true,
      message: 'Annotation complete, game ready for analysis',
    });
  } catch (error) {
    console.error('Failed to complete annotation:', error);
    return NextResponse.json(
      { error: 'Failed to complete annotation' },
      { status: 500 }
    );
  }
}
