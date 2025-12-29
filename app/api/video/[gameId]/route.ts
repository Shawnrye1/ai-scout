import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDownloadPresignedUrl } from '@/lib/storage/r2';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const proxy = request.nextUrl.searchParams.get('proxy') === 'true';

    // Get the game to find the video key
    const [game] = await db
      .select({
        id: games.id,
        videoKey: games.videoKey,
        videoUrl: games.videoUrl,
      })
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // If there's a video key, generate a presigned URL
    if (game.videoKey) {
      const presignedUrl = await getDownloadPresignedUrl(game.videoKey, 3600); // 1 hour

      // If proxy mode, stream the video through the server to avoid CORS
      if (proxy) {
        const range = request.headers.get('range');
        const headers: HeadersInit = {};
        if (range) {
          headers['Range'] = range;
        }

        const videoResponse = await fetch(presignedUrl, { headers });

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', videoResponse.headers.get('Content-Type') || 'video/mp4');
        responseHeaders.set('Accept-Ranges', 'bytes');

        if (videoResponse.headers.get('Content-Length')) {
          responseHeaders.set('Content-Length', videoResponse.headers.get('Content-Length')!);
        }
        if (videoResponse.headers.get('Content-Range')) {
          responseHeaders.set('Content-Range', videoResponse.headers.get('Content-Range')!);
        }

        return new NextResponse(videoResponse.body, {
          status: videoResponse.status,
          headers: responseHeaders,
        });
      }

      return NextResponse.json({ url: presignedUrl });
    }

    // If there's a direct video URL that's a local file path, stream it
    if (game.videoUrl && (game.videoUrl.startsWith('/') || game.videoUrl.startsWith('/tmp'))) {
      const filePath = game.videoUrl;

      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { error: 'Video file not found' },
          { status: 404 }
        );
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = request.headers.get('range');

      if (range) {
        // Handle range requests for video seeking
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const fileStream = fs.createReadStream(filePath, { start, end });
        const chunks: Buffer[] = [];

        for await (const chunk of fileStream) {
          chunks.push(Buffer.from(chunk));
        }

        const buffer = Buffer.concat(chunks);

        return new NextResponse(buffer, {
          status: 206,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
          },
        });
      } else {
        // Stream entire file
        const fileBuffer = fs.readFileSync(filePath);

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': String(fileSize),
            'Accept-Ranges': 'bytes',
          },
        });
      }
    }

    // If there's a direct video URL (YouTube, external), return that
    if (game.videoUrl) {
      if (proxy) {
        // For external URLs in proxy mode, fetch and stream
        const range = request.headers.get('range');
        const headers: HeadersInit = {};
        if (range) {
          headers['Range'] = range;
        }

        const videoResponse = await fetch(game.videoUrl, { headers });

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', videoResponse.headers.get('Content-Type') || 'video/mp4');
        responseHeaders.set('Accept-Ranges', 'bytes');

        if (videoResponse.headers.get('Content-Length')) {
          responseHeaders.set('Content-Length', videoResponse.headers.get('Content-Length')!);
        }
        if (videoResponse.headers.get('Content-Range')) {
          responseHeaders.set('Content-Range', videoResponse.headers.get('Content-Range')!);
        }

        return new NextResponse(videoResponse.body, {
          status: videoResponse.status,
          headers: responseHeaders,
        });
      }
      return NextResponse.json({ url: game.videoUrl });
    }

    return NextResponse.json(
      { error: 'No video available for this game' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Failed to get video URL:', error);
    return NextResponse.json(
      { error: 'Failed to get video URL' },
      { status: 500 }
    );
  }
}
