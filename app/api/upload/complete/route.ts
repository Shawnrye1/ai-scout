import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { getPublicUrl } from '@/lib/storage/r2';
import { z } from 'zod';

const completeSchema = z.object({
  gameId: z.string().uuid(),
  key: z.string().min(1),
  fileSize: z.number().positive(),
  duration: z.number().positive().optional(),
});

// POST /api/upload/complete - Mark upload as complete and trigger processing
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = completeSchema.parse(body);

    // Verify game ownership
    const game = await db.query.games.findFirst({
      where: eq(games.id, data.gameId),
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const teamResult = await db.query.teamMembers.findFirst({
      where: (tm, { eq }) => eq(tm.userId, user.id),
    });

    if (game.teamId !== teamResult?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get public URL for the video
    const videoUrl = await getPublicUrl(data.key);

    // Update game with video info and set status to queued
    const [updatedGame] = await db.update(games)
      .set({
        videoKey: data.key,
        videoUrl: typeof videoUrl === 'string' ? videoUrl : null,
        videoSizeBytes: data.fileSize,
        videoDurationSeconds: data.duration,
        status: 'queued',
        processingProgress: 0,
        updatedAt: new Date(),
      })
      .where(eq(games.id, data.gameId))
      .returning();

    // TODO: Trigger Modal processing job
    // await triggerModalProcessing(updatedGame.id, videoUrl);

    return NextResponse.json({
      game: updatedGame,
      message: 'Upload complete. Processing will begin shortly.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error completing upload:', error);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}
