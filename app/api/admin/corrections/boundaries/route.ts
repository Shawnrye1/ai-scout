import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays, corrections, games } from '@/lib/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

/**
 * Boundary Corrections API
 *
 * Handles Phase 1 of the correction workflow:
 * - Corrects play boundaries (start/end times)
 * - Splits plays when multiple plays exist in one segment
 * - Creates new plays from split points
 * - Saves correction data for model training
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      playId,
      gameId,
      originalStart,
      originalEnd,
      correctedStart,
      correctedEnd,
      splitPoints,
      hasMultiplePlays,
      notes,
    } = body;

    if (!playId || !gameId) {
      return NextResponse.json(
        { error: 'playId and gameId are required' },
        { status: 400 }
      );
    }

    // Get the original play
    const [originalPlay] = await db
      .select()
      .from(detectedPlays)
      .where(eq(detectedPlays.id, playId));

    if (!originalPlay) {
      return NextResponse.json(
        { error: 'Play not found' },
        { status: 404 }
      );
    }

    // Calculate all segments from boundaries and split points
    const segments: { start: number; end: number; playNumber: number }[] = [];

    if (splitPoints && splitPoints.length > 0) {
      // Sort split points
      const sortedSplits = [...splitPoints].sort((a, b) => a - b);

      // Create segments from start -> split1 -> split2 -> ... -> end
      let segmentStart = correctedStart;
      let playNum = originalPlay.playNumber || 1;

      for (const splitPoint of sortedSplits) {
        if (splitPoint > segmentStart && splitPoint < correctedEnd) {
          segments.push({
            start: segmentStart,
            end: splitPoint,
            playNumber: playNum++,
          });
          segmentStart = splitPoint;
        }
      }

      // Add final segment
      segments.push({
        start: segmentStart,
        end: correctedEnd,
        playNumber: playNum,
      });
    } else {
      // No splits - just one corrected segment
      segments.push({
        start: correctedStart,
        end: correctedEnd,
        playNumber: originalPlay.playNumber || 1,
      });
    }

    // Store the boundary correction for training
    await db.insert(corrections).values({
      playId,
      gameId,
      originalData: {
        startTimestamp: originalStart,
        endTimestamp: originalEnd,
        playType: originalPlay.playType,
      },
      correctedData: {
        actualStartTime: correctedStart,
        actualEndTime: correctedEnd,
        splitPoints: splitPoints || [],
        hasMultiplePlays: hasMultiplePlays || false,
      },
      correctionType: 'boundary',
      notes,
      correctedBy: 'admin', // TODO: Get actual user
    });

    const newPlays: any[] = [];
    const adjacentUpdates: string[] = [];

    // Auto-extend adjacent plays to maintain continuous coverage
    const finalStart = segments[0].start;
    const finalEnd = segments[segments.length - 1].end;

    // If start moved later, extend previous play's end to our new start
    if (finalStart > originalStart) {
      const [prevPlay] = await db
        .select({ id: detectedPlays.id, endTimestamp: detectedPlays.endTimestamp })
        .from(detectedPlays)
        .where(
          and(
            eq(detectedPlays.gameId, gameId),
            sql`CAST(${detectedPlays.endTimestamp} AS DECIMAL) <= ${originalStart + 0.5}`,
            sql`${detectedPlays.id} != ${playId}`
          )
        )
        .orderBy(sql`CAST(${detectedPlays.endTimestamp} AS DECIMAL) DESC`)
        .limit(1);

      if (prevPlay) {
        await db
          .update(detectedPlays)
          .set({ endTimestamp: String(finalStart), endTime: Math.round(finalStart) })
          .where(eq(detectedPlays.id, prevPlay.id));
        adjacentUpdates.push(`Extended previous play to ${finalStart}s`);
      }
    }

    // If end moved earlier, extend next play's start to our new end
    if (finalEnd < originalEnd) {
      const [nextPlay] = await db
        .select({ id: detectedPlays.id, startTimestamp: detectedPlays.startTimestamp })
        .from(detectedPlays)
        .where(
          and(
            eq(detectedPlays.gameId, gameId),
            sql`CAST(${detectedPlays.startTimestamp} AS DECIMAL) >= ${originalEnd - 0.5}`,
            sql`${detectedPlays.id} != ${playId}`
          )
        )
        .orderBy(sql`CAST(${detectedPlays.startTimestamp} AS DECIMAL) ASC`)
        .limit(1);

      if (nextPlay) {
        await db
          .update(detectedPlays)
          .set({ startTimestamp: String(finalEnd), startTime: Math.round(finalEnd) })
          .where(eq(detectedPlays.id, nextPlay.id));
        adjacentUpdates.push(`Extended next play from ${finalEnd}s`);
      }
    }

    if (segments.length === 1) {
      // Just update the original play with corrected boundaries
      await db
        .update(detectedPlays)
        .set({
          startTimestamp: String(segments[0].start),
          endTimestamp: String(segments[0].end),
          startTime: Math.round(segments[0].start),
          endTime: Math.round(segments[0].end),
          needsReview: true, // Keep in queue for Phase 2 analysis
          confidence: '0.90', // Higher confidence since boundaries are human-verified
        })
        .where(eq(detectedPlays.id, playId));

      newPlays.push({ id: playId, ...segments[0] });
    } else {
      // Multiple segments - update first, create rest

      // Update the original play to be the first segment
      await db
        .update(detectedPlays)
        .set({
          startTimestamp: String(segments[0].start),
          endTimestamp: String(segments[0].end),
          startTime: Math.round(segments[0].start),
          endTime: Math.round(segments[0].end),
          playNumber: segments[0].playNumber,
          needsReview: true, // Needs Phase 2 analysis
          confidence: '0.90',
          playType: null, // Clear play type so it needs to be set in Phase 2
        })
        .where(eq(detectedPlays.id, playId));

      newPlays.push({ id: playId, ...segments[0] });

      // Create new plays for remaining segments
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];

        // Check if a play with these exact timestamps already exists (prevent duplicates)
        const [existing] = await db
          .select({ id: detectedPlays.id })
          .from(detectedPlays)
          .where(
            and(
              eq(detectedPlays.gameId, gameId),
              sql`CAST(${detectedPlays.startTimestamp} AS DECIMAL) = ${segment.start}`,
              sql`CAST(${detectedPlays.endTimestamp} AS DECIMAL) = ${segment.end}`
            )
          )
          .limit(1);

        if (existing) {
          // Play already exists, just update it
          await db
            .update(detectedPlays)
            .set({
              playNumber: segment.playNumber,
              needsReview: true,
              confidence: '0.90',
            })
            .where(eq(detectedPlays.id, existing.id));
          newPlays.push({ id: existing.id, ...segment });
        } else {
          // Create new play
          const [newPlay] = await db
            .insert(detectedPlays)
            .values({
              gameId,
              playNumber: segment.playNumber,
              startTimestamp: String(segment.start),
              endTimestamp: String(segment.end),
              startTime: Math.round(segment.start),
              endTime: Math.round(segment.end),
              needsReview: true, // Needs Phase 2 analysis
              confidence: '0.90', // Human-verified boundaries
              // Copy relevant fields from original
              formation: originalPlay.formation,
              possessionTeamId: originalPlay.possessionTeamId,
            })
            .returning();

          newPlays.push({ id: newPlay.id, ...segment });
        }
      }

      // Renumber all plays in the game to maintain sequence
      await renumberPlays(gameId);
    }

    let message = segments.length > 1
      ? `Split into ${segments.length} plays. Review each play to add analysis.`
      : 'Boundaries corrected. Review play to add analysis.';

    if (adjacentUpdates.length > 0) {
      message += ` Adjacent plays adjusted to maintain continuous coverage.`;
    }

    return NextResponse.json({
      success: true,
      message,
      newPlays,
      segmentCount: segments.length,
      adjacentUpdates,
    });
  } catch (error) {
    console.error('Failed to save boundary correction:', error);
    return NextResponse.json(
      { error: 'Failed to save boundary correction' },
      { status: 500 }
    );
  }
}

/**
 * Renumber plays in a game to maintain sequential order by start time
 */
async function renumberPlays(gameId: string) {
  // Get all plays ordered by start time
  const plays = await db
    .select({ id: detectedPlays.id, startTimestamp: detectedPlays.startTimestamp })
    .from(detectedPlays)
    .where(eq(detectedPlays.gameId, gameId))
    .orderBy(sql`CAST(${detectedPlays.startTimestamp} AS DECIMAL)`);

  // Update play numbers sequentially
  for (let i = 0; i < plays.length; i++) {
    await db
      .update(detectedPlays)
      .set({ playNumber: i + 1 })
      .where(eq(detectedPlays.id, plays[i].id));
  }
}
