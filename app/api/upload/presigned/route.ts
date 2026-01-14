import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getUploadPresignedUrl, generateVideoKey } from '@/lib/storage/r2';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const presignedSchema = z.object({
  gameId: z.string().uuid(),
  filename: z.string().min(1),
  contentType: z.string().refine(
    (type) => ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'].includes(type),
    { message: 'Invalid video content type' }
  ),
});

// POST /api/upload/presigned - Get a presigned URL for uploading
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = presignedSchema.parse(body);

    // Verify the game exists and belongs to the user
    // (Limit check already done when game was created)
    const game = await db.query.games.findFirst({
      where: eq(games.id, data.gameId),
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const key = generateVideoKey(data.gameId, data.filename);
    const uploadUrl = await getUploadPresignedUrl(key, data.contentType, 3600); // 1 hour expiry

    return NextResponse.json({
      uploadUrl,
      key,
      expiresIn: 3600,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
