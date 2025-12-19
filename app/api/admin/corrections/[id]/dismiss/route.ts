import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Mark as reviewed (dismiss)
    await db
      .update(detectedPlays)
      .set({
        needsReview: false,
        confidence: '1.00', // Mark as verified (dismissed = correct)
      })
      .where(eq(detectedPlays.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to dismiss item:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss item' },
      { status: 500 }
    );
  }
}
