import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays, corrections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/webhooks/labelstudio
 *
 * Webhook called by Label Studio when an annotation is submitted.
 * Saves player annotations and creates a correction record for training.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log('Label Studio webhook received:', JSON.stringify(payload, null, 2));

    // Label Studio sends different action types
    const action = payload.action;

    // We only care about annotation created/updated events
    if (action !== 'ANNOTATION_CREATED' && action !== 'ANNOTATION_UPDATED') {
      return NextResponse.json({ status: 'ignored', action });
    }

    // Extract the annotation data
    const task = payload.task || payload.data;
    const annotation = payload.annotation;

    if (!task || !annotation) {
      console.log('Missing task or annotation data');
      return NextResponse.json({ status: 'ignored', reason: 'missing data' });
    }

    // Get playId from task data
    const playId = task.data?.playId;

    if (!playId) {
      console.log('No playId in task data');
      return NextResponse.json({ status: 'ignored', reason: 'no playId' });
    }

    // Process the annotation results
    const players: Array<{
      bbox: { x: number; y: number; width: number; height: number };
      jerseyNumber: string | null;
      team: string | null;
      frame: number;
      label: string;
    }> = [];

    for (const result of annotation.result || []) {
      if (result.type === 'videorectangle') {
        // Video rectangles store bbox in sequence array
        const sequence = result.value.sequence || [];
        const firstFrame = sequence[0] || {};

        const bbox = {
          x: firstFrame.x || 0,
          y: firstFrame.y || 0,
          width: firstFrame.width || 0,
          height: firstFrame.height || 0,
        };
        const frame = firstFrame.frame || 0;
        const label = result.value.labels?.[0] || 'Player';

        players.push({ bbox, jerseyNumber: null, team: null, frame, label });
      }
    }

    // Get the play's gameId and current rawData
    const [play] = await db
      .select({ gameId: detectedPlays.gameId, rawData: detectedPlays.rawData })
      .from(detectedPlays)
      .where(eq(detectedPlays.id, playId));

    if (!play) {
      return NextResponse.json({ status: 'error', reason: 'play not found' }, { status: 404 });
    }

    // Update the play's rawData with annotations
    const currentRawData = play.rawData as Record<string, unknown> || {};
    const updatedRawData = {
      ...currentRawData,
      labelStudioAnnotations: {
        taskId: task.id,
        players,
        annotatedAt: new Date().toISOString(),
        annotatedBy: annotation.completed_by || 'unknown',
      },
    };

    await db
      .update(detectedPlays)
      .set({
        rawData: updatedRawData,
      })
      .where(eq(detectedPlays.id, playId));

    // Create a correction record for training data export
    await db.insert(corrections).values({
      playId,
      gameId: play.gameId,
      correctionType: 'player_annotation',
      originalData: {},
      correctedData: {
        players,
        taskId: task.id,
        annotatedAt: new Date().toISOString(),
      },
      correctedBy: annotation.completed_by?.toString() || 'label_studio',
      notes: `${players.length} player bounding boxes annotated in Label Studio`,
      usedForTraining: false,
    });

    console.log(`Saved ${players.length} player annotations for play ${playId} (training record created)`);

    return NextResponse.json({
      status: 'success',
      playId,
      playerCount: players.length,
    });
  } catch (error) {
    console.error('Label Studio webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}

// Also handle GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'Label Studio webhook ready' });
}
