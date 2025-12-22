import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays, games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { labelStudio } from '@/lib/labelstudio/client';
import { getDownloadPresignedUrl } from '@/lib/storage/r2';

/**
 * POST /api/admin/labelstudio/send
 *
 * Send a play clip to Label Studio for player annotation
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

    // Get game info for video URL
    const [game] = await db
      .select({
        id: games.id,
        videoUrl: games.videoUrl,
        videoKey: games.videoKey,
      })
      .from(games)
      .where(eq(games.id, play.gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get video URL (presigned if using R2)
    let videoUrl = game.videoUrl;
    if (game.videoKey) {
      try {
        // Use longer expiry for Label Studio (24 hours)
        videoUrl = await getDownloadPresignedUrl(game.videoKey, 3600 * 24);
      } catch (e) {
        console.error('Failed to generate presigned URL:', e);
      }
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'No video URL available' }, { status: 400 });
    }

    // Get or create Label Studio project
    console.log('[Label Studio Send] Getting project...');
    const project = await labelStudio.getOrCreateSportsProject();
    console.log('[Label Studio Send] Got project:', project.id, project.title);

    // Check if task already exists for this play (prevent duplicates)
    const existingTasks = await labelStudio.getTasks(project.id);
    const existingTask = existingTasks.find((t: any) => t.data?.playId === playId);

    if (existingTask) {
      // Task already exists - update the video URL in case it expired
      // Presigned URLs expire after 24 hours
      const startTime = parseFloat(play.startTimestamp?.toString() || '0');
      const endTime = parseFloat(play.endTimestamp?.toString() || '0');
      const videoUrlWithFragment = `${videoUrl}#t=${Math.floor(startTime)},${Math.ceil(endTime)}`;

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
              video: videoUrlWithFragment, // Fresh presigned URL with time fragment
            },
          }),
        });
      } catch (e) {
        console.error('Failed to refresh video URL:', e);
      }

      return NextResponse.json({
        success: true,
        taskId: existingTask.id,
        projectUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}`,
        taskUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}/data?task=${existingTask.id}`,
        message: 'Task already exists for this play',
        existing: true,
      });
    }

    // Create task in Label Studio
    const startTime = parseFloat(play.startTimestamp?.toString() || '0');
    const endTime = parseFloat(play.endTimestamp?.toString() || '0');

    // Add media fragment to constrain video to play segment
    // Format: video.mp4#t=start,end (in seconds)
    const videoUrlWithFragment = `${videoUrl}#t=${Math.floor(startTime)},${Math.ceil(endTime)}`;

    const task = await labelStudio.createTask(project.id, {
      video: videoUrlWithFragment,
      playId: play.id,
      gameId: play.gameId,
      playNumber: play.playNumber || 0,
      startTime,
      endTime,
    });

    // Note: Could add a labelStudioTaskId field to detectedPlays schema to track this
    // For now, we just return success - the task is created in Label Studio

    return NextResponse.json({
      success: true,
      taskId: task.id,
      projectUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}`,
      taskUrl: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}/data?task=${task.id}`,
    });
  } catch (error) {
    console.error('Failed to send to Label Studio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send to Label Studio' },
      { status: 500 }
    );
  }
}
