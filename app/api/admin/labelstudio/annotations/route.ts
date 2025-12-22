import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays, detectedPlayers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { labelStudio } from '@/lib/labelstudio/client';

/**
 * GET /api/admin/labelstudio/annotations
 *
 * Get completed annotations from Label Studio
 */
export async function GET() {
  try {
    // Get the sports project
    const project = await labelStudio.getOrCreateSportsProject();

    // Get all annotations
    const annotations = await labelStudio.getAnnotations(project.id);

    // Filter to only completed annotations
    const completed = annotations.filter((task: any) =>
      task.annotations && task.annotations.length > 0
    );

    return NextResponse.json({
      total: annotations.length,
      completed: completed.length,
      annotations: completed.map((task: any) => ({
        taskId: task.id,
        playId: task.data?.playId,
        gameId: task.data?.gameId,
        playNumber: task.data?.playNumber,
        annotations: task.annotations.map((ann: any) => ({
          id: ann.id,
          createdAt: ann.created_at,
          result: ann.result,
        })),
      })),
    });
  } catch (error) {
    console.error('Failed to get annotations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get annotations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/labelstudio/annotations
 *
 * Import completed annotations back into our database
 * This updates detected players with corrected jersey numbers and bounding boxes
 */
export async function POST(request: NextRequest) {
  try {
    const { taskId, playId } = await request.json();

    if (!playId) {
      return NextResponse.json({ error: 'playId is required' }, { status: 400 });
    }

    // Get task annotations from Label Studio
    let annotations;
    if (taskId) {
      annotations = await labelStudio.getTaskAnnotations(taskId);
    } else {
      // Find task by playId
      const project = await labelStudio.getOrCreateSportsProject();
      const allAnnotations = await labelStudio.getAnnotations(project.id);
      const task = allAnnotations.find((t: any) => t.data?.playId === playId);
      if (!task) {
        return NextResponse.json({ error: 'No annotations found for this play' }, { status: 404 });
      }
      annotations = task.annotations || [];
    }

    if (!annotations || annotations.length === 0) {
      return NextResponse.json({ error: 'No annotations completed yet' }, { status: 404 });
    }

    // Get the latest annotation
    const latestAnnotation = annotations[annotations.length - 1];

    // Process the annotation results
    const players: Array<{
      bbox: { x: number; y: number; width: number; height: number };
      jerseyNumber: string | null;
      team: string | null;
      frame: number;
      label: string;
    }> = [];

    for (const result of latestAnnotation.result || []) {
      if (result.type === 'videorectangle') {
        // Video rectangles store bbox in sequence array (for keyframe interpolation)
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

        // Find associated jersey number and team from linked results (by region id)
        let jerseyNumber = null;
        let team = null;
        const regionId = result.id;

        for (const r of latestAnnotation.result || []) {
          // Check if this result is linked to our region
          if (r.from_name === 'jerseyNumber' && r.id === regionId) {
            jerseyNumber = r.value?.text?.[0] || null;
          }
          if (r.from_name === 'team' && r.id === regionId) {
            team = r.value?.choices?.[0] || null;
          }
        }

        players.push({ bbox, jerseyNumber, team, frame, label });
      }
    }

    // Update the play to mark as annotated (set confidence to 1.0 = human verified)
    await db
      .update(detectedPlays)
      .set({
        needsReview: false,
        confidence: '1.00', // Human verified
      })
      .where(eq(detectedPlays.id, playId));

    return NextResponse.json({
      success: true,
      imported: {
        playId,
        playerCount: players.length,
        players,
      },
    });
  } catch (error) {
    console.error('Failed to import annotations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import annotations' },
      { status: 500 }
    );
  }
}
