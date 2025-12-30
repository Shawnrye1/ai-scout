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

    // For serverless environments (Vercel), return the video URL
    // Prefer public URL over presigned URL for reliability
    let videoUrl: string | null = null;

    // Priority 1: Use existing public videoUrl if available
    if (game.videoUrl && game.videoUrl.startsWith('http')) {
      videoUrl = game.videoUrl;
    }
    // Priority 2: Generate presigned URL from video key
    else if (game.videoKey) {
      try {
        videoUrl = await getDownloadPresignedUrl(game.videoKey, 3600);
      } catch (e) {
        console.error('Failed to get presigned URL:', e);
      }
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'No video available' }, { status: 404 });
    }

    // Get clip boundaries from query params (if provided by Gemini)
    const clipStart = request.nextUrl.searchParams.get('clipStart');
    const clipEnd = request.nextUrl.searchParams.get('clipEnd');

    // Use Gemini-provided boundaries, or default to 8-second window
    const startTime = clipStart ? parseFloat(clipStart) : Math.max(0, timestampSeconds - 3);
    const endTime = clipEnd ? parseFloat(clipEnd) : timestampSeconds + 5;

    // Return JSON with the video URL and clip boundaries
    return NextResponse.json({
      videoUrl,
      seekTo: startTime,
      endTime: endTime,
      timestamp: timestampSeconds,
    });
  } catch (error) {
    console.error('Failed to get clip info:', error);
    return NextResponse.json({ error: 'Failed to get clip info' }, { status: 500 });
  }
}
