import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function GET(request: NextRequest) {
  try {
    const gameId = request.nextUrl.searchParams.get('gameId');
    const timestamp = request.nextUrl.searchParams.get('timestamp');

    if (!gameId || !timestamp) {
      return NextResponse.json({ error: 'Missing gameId or timestamp' }, { status: 400 });
    }

    const timestampSeconds = parseFloat(timestamp);

    // Get the game
    const [game] = await db
      .select({ videoUrl: games.videoUrl })
      .from(games)
      .where(eq(games.id, gameId));

    if (!game || !game.videoUrl) {
      return NextResponse.json({ error: 'Game or video not found' }, { status: 404 });
    }

    const videoPath = game.videoUrl;

    // Check if it's a local file
    if (!videoPath.startsWith('/')) {
      return NextResponse.json({ error: 'Only local files supported for clips' }, { status: 400 });
    }

    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
    }

    // Create a unique clip filename
    const clipId = `${gameId}-${Math.floor(timestampSeconds)}`;
    const clipPath = path.join(os.tmpdir(), `clip-${clipId}.mp4`);

    // Extract 8-second clip (3 seconds before, 5 seconds after)
    const startTime = Math.max(0, timestampSeconds - 3);

    // Only extract if clip doesn't exist (cache)
    if (!fs.existsSync(clipPath)) {
      try {
        execSync(
          `ffmpeg -y -ss ${startTime} -i "${videoPath}" -t 8 -c:v libx264 -preset ultrafast -c:a aac "${clipPath}" 2>/dev/null`,
          { timeout: 30000 }
        );
      } catch (e) {
        // Try with copy codec if re-encoding fails
        execSync(
          `ffmpeg -y -ss ${startTime} -i "${videoPath}" -t 8 -c copy "${clipPath}" 2>/dev/null`,
          { timeout: 30000 }
        );
      }
    }

    // Read and return the clip
    const clipBuffer = fs.readFileSync(clipPath);
    const stat = fs.statSync(clipPath);

    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      const chunk = clipBuffer.subarray(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return new NextResponse(clipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(stat.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to extract clip:', error);
    return NextResponse.json({ error: 'Failed to extract clip' }, { status: 500 });
  }
}
