/**
 * Video Clip Extractor
 *
 * Extracts short clips from full videos using ffmpeg.
 * Used to create proper clips for Label Studio annotation.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'aiscoutvideos';

interface ExtractClipOptions {
  videoKey: string;       // R2 key of source video
  startTime: number;      // Start time in seconds
  endTime: number;        // End time in seconds
  gameId: string;         // Game ID for organizing clips
  playId: string;         // Play ID for unique clip naming
}

interface ClipResult {
  clipKey: string;        // R2 key of extracted clip
  clipUrl: string;        // Pre-signed URL for Label Studio
  durationSeconds: number;
  frameCount: number;     // Approximate frame count at 30fps
}

/**
 * Extract a video clip from a source video in R2
 */
export async function extractVideoClip(options: ExtractClipOptions): Promise<ClipResult> {
  const { videoKey, startTime, endTime, gameId, playId } = options;
  const duration = endTime - startTime;

  console.log(`[ClipExtractor] Extracting clip from ${videoKey}`);
  console.log(`[ClipExtractor] Time range: ${startTime}s to ${endTime}s (${duration}s)`);

  // Create temp directory for processing
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clip-'));
  const inputPath = path.join(tempDir, 'input.mp4');
  const outputPath = path.join(tempDir, 'clip.mp4');

  try {
    // Step 1: Download source video from R2
    console.log('[ClipExtractor] Downloading source video...');
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET,
      Key: videoKey,
    });
    const response = await s3Client.send(getCommand);

    if (!response.Body) {
      throw new Error('Failed to download video from R2');
    }

    // Write to temp file
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    await fs.writeFile(inputPath, Buffer.concat(chunks));
    console.log('[ClipExtractor] Source video downloaded');

    // Step 2: Extract clip using ffmpeg
    console.log('[ClipExtractor] Extracting clip with ffmpeg...');
    await runFfmpeg([
      '-ss', startTime.toString(),      // Seek to start (before input for speed)
      '-i', inputPath,                   // Input file
      '-t', duration.toString(),         // Duration
      '-c:v', 'libx264',                 // Re-encode video (ensures clean cut)
      '-preset', 'fast',                 // Fast encoding
      '-crf', '23',                      // Quality (lower = better, 23 is default)
      '-c:a', 'aac',                     // Audio codec
      '-movflags', '+faststart',         // Web optimization
      '-y',                              // Overwrite output
      outputPath,
    ]);
    console.log('[ClipExtractor] Clip extracted');

    // Step 3: Upload clip to R2
    const clipKey = `clips/${gameId}/${playId}.mp4`;
    console.log(`[ClipExtractor] Uploading clip to ${clipKey}...`);

    const clipData = await fs.readFile(outputPath);
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: clipKey,
      Body: clipData,
      ContentType: 'video/mp4',
    }));
    console.log('[ClipExtractor] Clip uploaded');

    // Step 4: Generate pre-signed URL (24 hours for Label Studio)
    const clipUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET, Key: clipKey }),
      { expiresIn: 86400 }
    );

    const frameCount = Math.round(duration * 30); // Approximate at 30fps

    return {
      clipKey,
      clipUrl,
      durationSeconds: duration,
      frameCount,
    };

  } finally {
    // Cleanup temp files
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (e) {
      console.error('[ClipExtractor] Failed to cleanup temp dir:', e);
    }
  }
}

/**
 * Run ffmpeg command and return promise
 */
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('[ClipExtractor] ffmpeg error:', stderr);
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`ffmpeg failed to start: ${err.message}`));
    });
  });
}

/**
 * Get pre-signed URL for an existing clip
 */
export async function getClipUrl(clipKey: string): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: clipKey }),
    { expiresIn: 86400 }
  );
}

/**
 * Check if a clip already exists in R2
 */
export async function clipExists(clipKey: string): Promise<boolean> {
  try {
    await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: clipKey,
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Batch extraction options for multiple clips from one video
 */
interface BatchClipOptions {
  videoKey: string;
  gameId: string;
  clips: Array<{
    playId: string;
    startTime: number;
    endTime: number;
  }>;
}

interface BatchClipResult {
  successful: Array<{ playId: string; clipKey: string; clipUrl: string }>;
  failed: Array<{ playId: string; error: string }>;
  skipped: Array<{ playId: string; reason: string }>;
}

/**
 * Extract multiple clips from a single video (downloads video once)
 * Much faster than extracting clips one by one
 */
export async function extractVideoClipsBatch(options: BatchClipOptions): Promise<BatchClipResult> {
  const { videoKey, gameId, clips } = options;

  console.log(`[ClipExtractor] Batch extracting ${clips.length} clips from ${videoKey}`);

  const result: BatchClipResult = {
    successful: [],
    failed: [],
    skipped: [],
  };

  if (clips.length === 0) {
    return result;
  }

  // Create temp directory for processing
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batch-clips-'));
  const inputPath = path.join(tempDir, 'input.mp4');

  try {
    // Step 1: Download source video ONCE
    console.log('[ClipExtractor] Downloading source video...');
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET,
      Key: videoKey,
    });
    const response = await s3Client.send(getCommand);

    if (!response.Body) {
      throw new Error('Failed to download video from R2');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    await fs.writeFile(inputPath, Buffer.concat(chunks));
    console.log('[ClipExtractor] Source video downloaded');

    // Step 2: Extract each clip
    for (const clip of clips) {
      const clipKey = `clips/${gameId}/${clip.playId}.mp4`;
      const outputPath = path.join(tempDir, `${clip.playId}.mp4`);

      // Check if already exists
      if (await clipExists(clipKey)) {
        result.skipped.push({ playId: clip.playId, reason: 'already exists' });
        continue;
      }

      // Validate timestamps
      const duration = clip.endTime - clip.startTime;
      if (duration <= 0) {
        result.failed.push({ playId: clip.playId, error: 'Invalid timestamps' });
        continue;
      }

      try {
        console.log(`[ClipExtractor] Extracting clip ${clip.playId} (${clip.startTime}s - ${clip.endTime}s)`);

        await runFfmpeg([
          '-ss', clip.startTime.toString(),
          '-i', inputPath,
          '-t', duration.toString(),
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23',
          '-c:a', 'aac',
          '-movflags', '+faststart',
          '-y',
          outputPath,
        ]);

        // Upload to R2
        const clipData = await fs.readFile(outputPath);
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: clipKey,
          Body: clipData,
          ContentType: 'video/mp4',
        }));

        // Generate presigned URL
        const clipUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({ Bucket: BUCKET, Key: clipKey }),
          { expiresIn: 86400 }
        );

        result.successful.push({ playId: clip.playId, clipKey, clipUrl });

        // Clean up individual clip file
        await fs.unlink(outputPath).catch(() => {});

      } catch (error) {
        result.failed.push({
          playId: clip.playId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[ClipExtractor] Batch complete: ${result.successful.length} success, ${result.failed.length} failed, ${result.skipped.length} skipped`);
    return result;

  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (e) {
      console.error('[ClipExtractor] Failed to cleanup temp dir:', e);
    }
  }
}
