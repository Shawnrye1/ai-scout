import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { getPublicUrl, getDownloadPresignedUrl } from '@/lib/storage/r2';
import { z } from 'zod';
import { inngest } from '@/lib/inngest/client';
// Using Inngest for reliable background job processing with retries

// Schema for file uploads
const fileUploadSchema = z.object({
  gameId: z.string().uuid(),
  key: z.string().min(1),
  fileSize: z.number().positive(),
  duration: z.number().positive().optional(),
});

// Schema for URL-based uploads (Hudl, YouTube, etc.)
const urlUploadSchema = z.object({
  gameId: z.string().uuid(),
  videoUrl: z.string().url(),
  videoSource: z.enum(['hudl', 'youtube', 'vimeo', 'direct']),
});

// Combined schema - either file OR url
const completeSchema = z.union([fileUploadSchema, urlUploadSchema]);

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

    // Check if this is a URL-based or file-based upload
    const isUrlUpload = 'videoUrl' in data && 'videoSource' in data;

    let updatedGame;
    let downloadUrl: string;

    if (isUrlUpload) {
      // URL-based upload (Hudl, YouTube, Vimeo, direct link)
      const urlData = data as z.infer<typeof urlUploadSchema>;

      [updatedGame] = await db.update(games)
        .set({
          videoUrl: urlData.videoUrl,
          videoSource: urlData.videoSource,
          status: 'queued',
          processingProgress: 0,
          updatedAt: new Date(),
        })
        .where(eq(games.id, data.gameId))
        .returning();

      // For URL-based uploads, use the URL directly
      downloadUrl = urlData.videoUrl;
    } else {
      // File-based upload (R2)
      const fileData = data as z.infer<typeof fileUploadSchema>;

      // Get public URL for the video
      const videoUrl = await getPublicUrl(fileData.key);

      [updatedGame] = await db.update(games)
        .set({
          videoKey: fileData.key,
          videoUrl: typeof videoUrl === 'string' ? videoUrl : null,
          videoSizeBytes: fileData.fileSize,
          videoDurationSeconds: fileData.duration,
          status: 'queued',
          processingProgress: 0,
          updatedAt: new Date(),
        })
        .where(eq(games.id, data.gameId))
        .returning();

      // Get a presigned URL for Modal to download the video
      downloadUrl = await getDownloadPresignedUrl(fileData.key, 3600 * 4); // 4 hour expiry
    }

    // Trigger analysis via Inngest (reliable background job with retries)
    // This is durable - if it fails, Inngest will retry automatically
    try {
      await inngest.send({
        name: 'game/uploaded',
        data: {
          gameId: updatedGame.id,
          userId: user.id.toString(),
          teamId: teamResult?.teamId || '',
          videoUrl: downloadUrl,
          sport: (updatedGame.sport as 'basketball' | 'football') || 'basketball',
        },
      });

      console.log(`Inngest event sent for game ${updatedGame.id}`);
    } catch (err) {
      console.error('Failed to send Inngest event:', err);
      // Don't fail the request - the game is created, user can retry analysis
    }

    return NextResponse.json({
      game: updatedGame,
      message: isUrlUpload
        ? 'Video URL received. Analysis queued and will start shortly.'
        : 'Upload complete. Analysis queued and will start shortly.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error completing upload:', error);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}
