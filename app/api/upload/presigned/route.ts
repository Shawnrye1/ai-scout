import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getUploadPresignedUrl, generateVideoKey } from '@/lib/storage/r2';
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
