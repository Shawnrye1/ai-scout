import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays, games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { labelStudio, LabelStudioPrediction } from '@/lib/labelstudio/client';
import { extractVideoClip, clipExists, getClipUrl } from '@/lib/video/clip-extractor';

/**
 * Get predictions from ML backend
 *
 * Calls the Modal ML backend to run YOLO detection on the video clip
 * and returns predictions in Label Studio format.
 */
async function getMLPredictions(videoUrl: string): Promise<LabelStudioPrediction | null> {
  const mlBackendUrl = process.env.LABEL_STUDIO_ML_BACKEND_URL;

  if (!mlBackendUrl) {
    console.log('[ML Backend] No ML_BACKEND_URL configured, skipping pre-labeling');
    return null;
  }

  try {
    console.log('[ML Backend] Getting predictions from:', mlBackendUrl);

    // Call the standalone predict_clip function on Modal
    const response = await fetch(`${mlBackendUrl}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: [{
          data: { video: videoUrl }
        }]
      }),
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    if (!response.ok) {
      console.error('[ML Backend] Error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const predictions = data.results?.[0];

    if (predictions && predictions.result?.length > 0) {
      console.log(`[ML Backend] Got ${predictions.result.length} predictions`);
      return predictions;
    }

    console.log('[ML Backend] No predictions returned');
    return null;
  } catch (error) {
    console.error('[ML Backend] Failed to get predictions:', error);
    return null;
  }
}

/**
 * POST /api/admin/labelstudio/send
 *
 * Send a play clip to Label Studio for player annotation.
 *
 * This extracts the actual video clip (using ffmpeg) so that:
 * - Label Studio only shows the relevant clip
 * - Frame numbers are relative to the clip start (frame 0 = clip start)
 * - Training frame extraction matches what's annotated
 *
 * NEW: If ML backend is configured, automatically gets pre-annotations
 * so annotators only need to correct instead of drawing from scratch.
 *
 * Body: { playId: string, skipPredictions?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { playId, skipPredictions } = await request.json();

    if (!playId) {
      return NextResponse.json({ error: 'playId is required' }, { status: 400 });
    }

    // Get play info
    const [play] = await db
      .select({
        id: detectedPlays.id,
        gameId: detectedPlays.gameId,
        playNumber: detectedPlays.playNumber,
        startTimestamp: detectedPlays.startTimestamp,
        endTimestamp: detectedPlays.endTimestamp,
      })
      .from(detectedPlays)
      .where(eq(detectedPlays.id, playId));

    if (!play) {
      return NextResponse.json({ error: 'Play not found' }, { status: 404 });
    }

    // Get game info for video
    const [game] = await db
      .select({
        id: games.id,
        videoKey: games.videoKey,
      })
      .from(games)
      .where(eq(games.id, play.gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game.videoKey) {
      return NextResponse.json({ error: 'No video available for this game' }, { status: 400 });
    }

    const startTime = parseFloat(play.startTimestamp?.toString() || '0');
    const endTime = parseFloat(play.endTimestamp?.toString() || '0');

    if (endTime <= startTime) {
      return NextResponse.json({ error: 'Invalid play timestamps' }, { status: 400 });
    }

    // Check if clip already exists
    const clipKey = `clips/${game.id}/${play.id}.mp4`;
    let clipUrl: string;

    if (await clipExists(clipKey)) {
      console.log('[Label Studio Send] Using existing clip:', clipKey);
      clipUrl = await getClipUrl(clipKey);
    } else {
      // Extract new clip
      console.log('[Label Studio Send] Extracting clip...');
      const result = await extractVideoClip({
        videoKey: game.videoKey,
        startTime,
        endTime,
        gameId: game.id,
        playId: play.id,
      });
      clipUrl = result.clipUrl;
      console.log('[Label Studio Send] Clip extracted:', result.clipKey);
    }

    // Get or create Label Studio project
    console.log('[Label Studio Send] Getting project...');
    const project = await labelStudio.getOrCreateSportsProject();
    console.log('[Label Studio Send] Got project:', project.id, project.title);

    // Check if task already exists for this play (prevent duplicates)
    const existingTasks = await labelStudio.getTasks(project.id);
    const existingTask = existingTasks.find((t: any) => t.data?.playId === playId);

    if (existingTask) {
      // Task already exists - update the clip URL in case it expired
      try {
        await fetch(`${process.env.LABEL_STUDIO_URL}/api/tasks/${existingTask.id}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Token ${process.env.LABEL_STUDIO_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              ...existingTask.data,
              video: clipUrl, // Fresh presigned URL for the clip
            },
          }),
        });
      } catch (e) {
        console.error('Failed to refresh clip URL:', e);
      }

      return NextResponse.json({
        success: true,
        taskId: existingTask.id,
        projectUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}`,
        taskUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}/data?task=${existingTask.id}`,
        message: 'Task already exists for this play (clip URL refreshed)',
        existing: true,
        clipKey,
      });
    }

    // Get ML predictions for pre-labeling (unless skipped)
    let predictions: LabelStudioPrediction | null = null;
    let predictionCount = 0;

    if (!skipPredictions) {
      console.log('[Label Studio Send] Getting ML predictions for pre-labeling...');
      predictions = await getMLPredictions(clipUrl);
      predictionCount = predictions?.result?.length || 0;
    }

    // Create task in Label Studio with the clip
    const taskData = {
      video: clipUrl,
      playId: play.id,
      gameId: play.gameId,
      playNumber: play.playNumber || 0,
      startTime: 0,  // Clip starts at 0
      endTime: endTime - startTime,  // Clip duration
    };

    let task;
    if (predictions && predictions.result.length > 0) {
      // Create task WITH pre-annotations
      console.log(`[Label Studio Send] Creating task with ${predictionCount} pre-annotations`);
      task = await labelStudio.createTaskWithPredictions(project.id, taskData, predictions);
    } else {
      // Create task without predictions (fallback)
      console.log('[Label Studio Send] Creating task without pre-annotations');
      task = await labelStudio.createTask(project.id, taskData);
    }

    return NextResponse.json({
      success: true,
      taskId: task.id,
      projectUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}`,
      taskUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}/data?task=${task.id}`,
      clipKey,
      clipDuration: endTime - startTime,
      predictionCount,
      hasPredictions: predictionCount > 0,
    });
  } catch (error) {
    console.error('Failed to send to Label Studio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send to Label Studio' },
      { status: 500 }
    );
  }
}
