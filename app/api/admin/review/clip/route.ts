import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDownloadPresignedUrl } from '@/lib/storage/r2';
import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Track download progress for remote videos
const downloadingVideos = new Map<string, Promise<string>>();

async function downloadRemoteVideo(videoUrl: string, gameId: string): Promise<string> {
  const cacheDir = path.join(os.tmpdir(), 'ai-scout-videos');
  const cachedPath = path.join(cacheDir, `${gameId}.mp4`);

  // Create cache directory if it doesn't exist
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Return cached file if it exists and is not empty
  if (fs.existsSync(cachedPath)) {
    const stat = fs.statSync(cachedPath);
    if (stat.size > 0) {
      return cachedPath;
    }
    // Remove empty/corrupt file
    fs.unlinkSync(cachedPath);
  }

  // Check if already downloading
  if (downloadingVideos.has(gameId)) {
    return downloadingVideos.get(gameId)!;
  }

  // Start download
  const downloadPromise = new Promise<string>((resolve, reject) => {
    console.log(`Downloading video for game ${gameId}...`);

    // Use curl for reliable downloading
    exec(
      `curl -L -s -o "${cachedPath}" "${videoUrl}"`,
      { timeout: 600000 }, // 10 minute timeout for large videos
      (error) => {
        downloadingVideos.delete(gameId);
        if (error) {
          // Clean up partial download
          if (fs.existsSync(cachedPath)) {
            fs.unlinkSync(cachedPath);
          }
          reject(error);
        } else {
          console.log(`Downloaded video for game ${gameId}`);
          resolve(cachedPath);
        }
      }
    );
  });

  downloadingVideos.set(gameId, downloadPromise);
  return downloadPromise;
}

export async function GET(request: NextRequest) {
  try {
    const gameId = request.nextUrl.searchParams.get('gameId');
    const timestamp = request.nextUrl.searchParams.get('timestamp');

    if (!gameId || !timestamp) {
      return NextResponse.json({ error: 'Missing gameId or timestamp' }, { status: 400 });
    }

    const timestampSeconds = parseFloat(timestamp);

    // Get the game with both videoUrl and videoKey
    const [game] = await db
      .select({
        videoUrl: games.videoUrl,
        videoKey: games.videoKey,
      })
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    let videoPath: string | null = null;

    // Priority 1: If there's a videoKey (R2 storage), get presigned URL and download
    if (game.videoKey) {
      try {
        const presignedUrl = await getDownloadPresignedUrl(game.videoKey, 3600);
        videoPath = await downloadRemoteVideo(presignedUrl, gameId);
      } catch (downloadError) {
        console.error('Failed to download video from R2:', downloadError);
        return NextResponse.json({ error: 'Failed to download video for clip extraction' }, { status: 500 });
      }
    }
    // Priority 2: If there's a remote URL (https://), download it
    else if (game.videoUrl && (game.videoUrl.startsWith('http://') || game.videoUrl.startsWith('https://'))) {
      try {
        videoPath = await downloadRemoteVideo(game.videoUrl, gameId);
      } catch (downloadError) {
        console.error('Failed to download video:', downloadError);
        return NextResponse.json({ error: 'Failed to download video for clip extraction' }, { status: 500 });
      }
    }
    // Priority 3: Local file path
    else if (game.videoUrl && game.videoUrl.startsWith('/')) {
      videoPath = game.videoUrl;
    }

    if (!videoPath) {
      return NextResponse.json({ error: 'No video available for this game' }, { status: 404 });
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
