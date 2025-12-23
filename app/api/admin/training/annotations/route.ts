import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { corrections, detectedPlays, games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Create S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'aiscoutvideos';

/**
 * Generate a pre-signed URL for accessing a video/clip in R2
 */
async function getPresignedUrl(key: string): Promise<string | null> {
  if (!key) return null;

  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    // URL valid for 2 hours (enough time for training)
    return await getSignedUrl(s3Client, command, { expiresIn: 7200 });
  } catch (error) {
    console.error('Failed to generate presigned URL for', key, error);
    return null;
  }
}

/**
 * Check if a clip exists in R2
 */
async function clipExists(clipKey: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: clipKey }));
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/training/annotations
 *
 * Export player annotations in a format suitable for YOLO training.
 * This endpoint is called by the Modal training function.
 *
 * IMPORTANT: Uses extracted clips (not full videos) so frame numbers match.
 * Clips are stored at: clips/{gameId}/{playId}.mp4
 *
 * Returns annotations with:
 * - videoUrl: Pre-signed URL to download the CLIP from R2
 * - frameNumber: Frame to extract (relative to clip start, NOT full video)
 * - imageWidth/imageHeight: Dimensions
 * - bboxes: Array of {x, y, width, height, class}
 */
export async function GET(request: NextRequest) {
  try {
    // Get all player_annotation corrections
    const playerAnnotations = await db
      .select({
        id: corrections.id,
        playId: corrections.playId,
        gameId: corrections.gameId,
        correctedData: corrections.correctedData,
        usedForTraining: corrections.usedForTraining,
      })
      .from(corrections)
      .where(eq(corrections.correctionType, 'player_annotation'));

    // Build clip keys and generate pre-signed URLs
    const clipUrlCache: Record<string, string | null> = {};

    // Transform to training format
    const annotations: any[] = [];

    for (const ann of playerAnnotations) {
      const correctedData = ann.correctedData as any;
      if (!correctedData) continue;

      // Build clip key from gameId and playId
      const clipKey = ann.gameId && ann.playId
        ? `clips/${ann.gameId}/${ann.playId}.mp4`
        : null;

      // Get or cache presigned URL for clip
      let videoUrl: string | null = null;
      if (clipKey) {
        if (clipUrlCache[clipKey] === undefined) {
          // Check if clip exists, then get URL
          if (await clipExists(clipKey)) {
            clipUrlCache[clipKey] = await getPresignedUrl(clipKey);
          } else {
            console.warn(`Clip not found: ${clipKey}`);
            clipUrlCache[clipKey] = null;
          }
        }
        videoUrl = clipUrlCache[clipKey];
      }

      // Handle different annotation formats

      // Format 1: Direct bboxes array
      if (correctedData.bboxes && Array.isArray(correctedData.bboxes)) {
        annotations.push({
          correctionId: ann.id,
          imageUrl: correctedData.imageUrl || correctedData.frameUrl,
          videoUrl,
          clipKey,
          frameNumber: correctedData.frame || correctedData.frameNumber || 0,
          imageWidth: correctedData.imageWidth || correctedData.width || 1920,
          imageHeight: correctedData.imageHeight || correctedData.height || 1080,
          bboxes: correctedData.bboxes.map((bbox: any) => ({
            x: bbox.x,
            y: bbox.y,
            width: bbox.width || bbox.w,
            height: bbox.height || bbox.h,
            class: bbox.class || bbox.label || 'player',
            jerseyNumber: bbox.jerseyNumber || bbox.jersey_number,
          })),
        });
      }

      // Format 2: Label Studio format with players array (most common)
      if (correctedData.players && Array.isArray(correctedData.players)) {
        // Group players by frame number
        const frameGroups: { [key: number]: any[] } = {};
        for (const player of correctedData.players) {
          const frame = player.frame || 0;
          if (!frameGroups[frame]) frameGroups[frame] = [];
          frameGroups[frame].push(player);
        }

        // Create an annotation for each frame
        for (const [frameNum, players] of Object.entries(frameGroups)) {
          const bboxes = players.map((player: any) => ({
            // Bbox values are in percentages (0-100), keep as percentages for YOLO
            x: player.bbox?.x || player.x || 0,
            y: player.bbox?.y || player.y || 0,
            width: player.bbox?.width || player.width || player.w || 0,
            height: player.bbox?.height || player.height || player.h || 0,
            class: player.label?.toLowerCase() || 'player',
            jerseyNumber: player.jerseyNumber || player.jersey_number,
          }));

          if (bboxes.length > 0) {
            annotations.push({
              correctionId: ann.id,
              imageUrl: correctedData.imageUrl || correctedData.frameUrl,
              videoUrl,
              clipKey,
              frameNumber: parseInt(frameNum),
              imageWidth: correctedData.imageWidth || correctedData.width || 1920,
              imageHeight: correctedData.imageHeight || correctedData.height || 1080,
              bboxes,
            });
          }
        }
      }

      // Format 3: Label Studio annotation format
      if (correctedData.labelStudioAnnotations) {
        const lsAnn = correctedData.labelStudioAnnotations;
        const bboxes = (lsAnn.result || [])
          .filter((r: any) => r.type === 'rectanglelabels')
          .map((r: any) => {
            const value = r.value;
            return {
              // Label Studio uses percentages (0-100), keep as percentages
              x: value.x,
              y: value.y,
              width: value.width,
              height: value.height,
              class: value.rectanglelabels?.[0] || 'player',
            };
          });

        if (bboxes.length > 0) {
          annotations.push({
            correctionId: ann.id,
            imageUrl: lsAnn.data?.image || correctedData.imageUrl,
            videoUrl,
            clipKey,
            frameNumber: correctedData.frame || correctedData.frameNumber || 0,
            imageWidth: lsAnn.original_width || 1920,
            imageHeight: lsAnn.original_height || 1080,
            bboxes,
          });
        }
      }
    }

    // Filter: need either imageUrl OR (videoUrl + frameNumber) for frame extraction
    const validAnnotations = annotations.filter(
      (a) => a.bboxes.length > 0 && (a.imageUrl || (a.videoUrl && a.frameNumber !== undefined))
    );

    // Warn about annotations without clips
    const annotationsWithoutClips = annotations.filter(
      (a) => a.bboxes.length > 0 && !a.videoUrl && !a.imageUrl
    );
    if (annotationsWithoutClips.length > 0) {
      console.warn(
        `${annotationsWithoutClips.length} annotations have no clip - use "Open in Label Studio" button to create clips`
      );
    }

    // Count total bboxes
    const totalBboxes = validAnnotations.reduce((sum, a) => sum + a.bboxes.length, 0);

    return NextResponse.json({
      annotations: validAnnotations,
      stats: {
        totalAnnotations: validAnnotations.length,
        totalBboxes,
        unusedForTraining: playerAnnotations.filter((a) => !a.usedForTraining).length,
        annotationsWithoutClips: annotationsWithoutClips.length,
      },
    });
  } catch (error) {
    console.error('Failed to export annotations:', error);
    return NextResponse.json(
      { error: 'Failed to export annotations' },
      { status: 500 }
    );
  }
}
