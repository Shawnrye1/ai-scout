import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays, games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { labelStudio } from '@/lib/labelstudio/client';
import { extractVideoClip, clipExists, getClipUrl } from '@/lib/video/clip-extractor';

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
 * Body: { playId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { playId } = await request.json();

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

    // Create new task in Label Studio with the clip
    const task = await labelStudio.createTask(project.id, {
      video: clipUrl,
      playId: play.id,
      gameId: play.gameId,
      playNumber: play.playNumber || 0,
      startTime: 0,  // Clip starts at 0
      endTime: endTime - startTime,  // Clip duration
    });

    return NextResponse.json({
      success: true,
      taskId: task.id,
      projectUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}`,
      taskUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}/data?task=${task.id}`,
      clipKey,
      clipDuration: endTime - startTime,
    });
  } catch (error) {
    console.error('Failed to send to Label Studio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send to Label Studio' },
      { status: 500 }
    );
  }
}
