import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlays } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Mark Annotation as Complete
 *
 * POST /api/admin/annotate/[gameId]/complete
 *
 * When annotation is complete:
 * 1. Sets annotationStatus to 'reviewed'
 * 2. Triggers clip extraction for all plays (same as Modal webhook)
 * 3. Game appears in Corrections Queue with clips ready for Label Studio
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Check how many plays exist for this game
    const plays = await db
      .select({ id: detectedPlays.id })
      .from(detectedPlays)
      .where(eq(detectedPlays.gameId, gameId));

    // Update game annotation status to reviewed
    await db
      .update(games)
      .set({
        annotationStatus: 'reviewed',
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    // Trigger clip extraction for all plays (same as Modal webhook)
    // This ensures clips are ready when user clicks "Analyze Video Clip"
    if (plays.length > 0) {
      const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/games/${gameId}/extract-clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(res => {
        if (res.ok) {
          console.log(`[Annotation Complete] Triggered clip extraction for game ${gameId} (${plays.length} plays)`);
        } else {
          console.error(`[Annotation Complete] Failed to trigger clip extraction: ${res.status}`);
        }
      }).catch(err => {
        console.error(`[Annotation Complete] Error triggering clip extraction:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Annotation complete. Extracting clips for ${plays.length} plays.`,
      playCount: plays.length,
    });
  } catch (error) {
    console.error('Failed to complete annotation:', error);
    return NextResponse.json(
      { error: 'Failed to complete annotation' },
      { status: 500 }
    );
  }
}
