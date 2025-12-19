import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays, detectedPlayers, corrections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, targetId, reason } = body;

    if (!type || !targetId) {
      return NextResponse.json(
        { error: 'Type and targetId are required' },
        { status: 400 }
      );
    }

    if (type === 'player') {
      // Get the player's game ID
      const [player] = await db
        .select({ gameId: detectedPlayers.gameId })
        .from(detectedPlayers)
        .where(eq(detectedPlayers.id, targetId));

      if (player) {
        // Create a correction entry for review
        await db.insert(corrections).values({
          gameId: player.gameId,
          correctionType: 'player_review',
          originalData: { playerId: targetId, reason },
          correctedData: null,
          correctedBy: 'coach', // TODO: Get actual user
          notes: reason,
        });
      }
    } else if (type === 'play') {
      // Flag the play for review
      await db
        .update(detectedPlays)
        .set({
          needsReview: true,
          flagReason: reason || 'Coach flagged for review',
        })
        .where(eq(detectedPlays.id, targetId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to flag item:', error);
    return NextResponse.json(
      { error: 'Failed to flag item' },
      { status: 500 }
    );
  }
}
