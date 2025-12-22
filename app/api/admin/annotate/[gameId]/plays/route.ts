import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays, corrections, games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

function uuidv4(): string {
  return crypto.randomUUID();
}

interface PlayUpdate {
  id: string;
  playNumber?: number;
  startTimestamp?: number;
  endTimestamp?: number;
  playType?: string | null;
  formation?: string | null;
  possessionTeamId?: string | null;
  shotAttempted?: boolean | null;
  shotMade?: boolean | null;
  turnover?: boolean | null;
  needsReview?: boolean | null;
  isDeleted?: boolean;
}

/**
 * Update or create plays for a game
 *
 * Handles:
 * - Updating existing play boundaries
 * - Creating new plays (IDs starting with 'new-')
 * - Deleting plays (isDeleted: true)
 * - Logging corrections for training
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { updates } = body as { updates: PlayUpdate[] };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid updates array' },
        { status: 400 }
      );
    }

    // Process each update
    const results: { id: string; action: string; success: boolean }[] = [];

    for (const update of updates) {
      try {
        const isNew = update.id.startsWith('new-');
        const isDeleted = update.isDeleted;

        if (isDeleted && !isNew) {
          // Get original data for correction logging
          const [original] = await db
            .select()
            .from(detectedPlays)
            .where(eq(detectedPlays.id, update.id));

          if (original) {
            // Log the deletion as a correction
            await db.insert(corrections).values({
              id: uuidv4(),
              playId: update.id,
              gameId,
              originalData: {
                playNumber: original.playNumber,
                startTimestamp: original.startTimestamp,
                endTimestamp: original.endTimestamp,
                playType: original.playType,
                formation: original.formation,
              },
              correctedData: { deleted: true },
              correctionType: 'play_deleted',
              correctedBy: 'admin',
              notes: 'Play deleted during annotation review',
            });

            // Delete the play
            await db.delete(detectedPlays).where(eq(detectedPlays.id, update.id));
            results.push({ id: update.id, action: 'deleted', success: true });
          }
        } else if (isNew) {
          // Create new play
          const newId = uuidv4();
          await db.insert(detectedPlays).values({
            id: newId,
            gameId,
            playNumber: update.playNumber,
            startTimestamp: update.startTimestamp?.toString(),
            endTimestamp: update.endTimestamp?.toString(),
            startTime: update.startTimestamp ? Math.floor(update.startTimestamp) : null,
            endTime: update.endTimestamp ? Math.floor(update.endTimestamp) : null,
            playType: update.playType,
            formation: update.formation,
            possessionTeamId: update.possessionTeamId,
            shotAttempted: update.shotAttempted,
            shotMade: update.shotMade,
            turnover: update.turnover,
            needsReview: update.needsReview ?? false,
            confidence: '1.0', // Human-created, high confidence
          });

          // Log as a correction (new play added)
          await db.insert(corrections).values({
            id: uuidv4(),
            playId: newId,
            gameId,
            originalData: null,
            correctedData: {
              playNumber: update.playNumber,
              startTimestamp: update.startTimestamp,
              endTimestamp: update.endTimestamp,
              playType: update.playType,
            },
            correctionType: 'play_added',
            correctedBy: 'admin',
            notes: 'New play added during annotation review',
          });

          results.push({ id: newId, action: 'created', success: true });
        } else {
          // Update existing play
          const [original] = await db
            .select()
            .from(detectedPlays)
            .where(eq(detectedPlays.id, update.id));

          if (original) {
            // Prepare update data
            const updateData: Record<string, any> = {};

            if (update.startTimestamp !== undefined) {
              updateData.startTimestamp = update.startTimestamp.toString();
              updateData.startTime = Math.floor(update.startTimestamp);
            }
            if (update.endTimestamp !== undefined) {
              updateData.endTimestamp = update.endTimestamp.toString();
              updateData.endTime = Math.floor(update.endTimestamp);
            }
            if (update.playNumber !== undefined) {
              updateData.playNumber = update.playNumber;
            }
            if (update.playType !== undefined) {
              updateData.playType = update.playType;
            }
            if (update.formation !== undefined) {
              updateData.formation = update.formation;
            }
            if (update.possessionTeamId !== undefined) {
              updateData.possessionTeamId = update.possessionTeamId;
            }
            if (update.shotAttempted !== undefined) {
              updateData.shotAttempted = update.shotAttempted;
            }
            if (update.shotMade !== undefined) {
              updateData.shotMade = update.shotMade;
            }
            if (update.turnover !== undefined) {
              updateData.turnover = update.turnover;
            }
            if (update.needsReview !== undefined) {
              updateData.needsReview = update.needsReview;
            }

            // Update the play
            await db
              .update(detectedPlays)
              .set(updateData)
              .where(eq(detectedPlays.id, update.id));

            // Log as a correction if boundaries changed
            if (update.startTimestamp !== undefined || update.endTimestamp !== undefined) {
              await db.insert(corrections).values({
                id: uuidv4(),
                playId: update.id,
                gameId,
                originalData: {
                  startTimestamp: parseFloat(original.startTimestamp?.toString() || '0'),
                  endTimestamp: parseFloat(original.endTimestamp?.toString() || '0'),
                },
                correctedData: {
                  startTimestamp: update.startTimestamp,
                  endTimestamp: update.endTimestamp,
                },
                correctionType: 'play_boundary',
                correctedBy: 'admin',
                notes: 'Play boundary adjusted during annotation review',
              });
            }

            results.push({ id: update.id, action: 'updated', success: true });
          }
        }
      } catch (err) {
        console.error(`Failed to process update for ${update.id}:`, err);
        results.push({ id: update.id, action: 'error', success: false });
      }
    }

    // Update game annotation status to in_progress
    await db
      .update(games)
      .set({
        annotationStatus: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Failed to update plays:', error);
    return NextResponse.json(
      { error: 'Failed to update plays' },
      { status: 500 }
    );
  }
}
