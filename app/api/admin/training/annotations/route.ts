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
 * Export training annotations for different model types.
 * This endpoint is called by the Modal training function.
 *
 * Query params:
 * - model_type: 'player_detection' (default) or 'play_classification'
 *
 * For player_detection:
 * - Returns bounding boxes for YOLO training
 *
 * For play_classification:
 * - Returns play clips with type labels for classification training
 */
export async function GET(request: NextRequest) {
  try {
    const modelType = request.nextUrl.searchParams.get('model_type') || 'player_detection';

    // Route to appropriate handler based on model type
    if (modelType === 'play_classification') {
      return await getPlayClassificationAnnotations();
    }

    // Default: player_detection
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

/**
 * Get play classification annotations for training
 * Returns play clips with their corrected play type labels
 */
async function getPlayClassificationAnnotations() {
  // Get all play_type corrections (from the analyze section)
  const playTypeCorrections = await db
    .select({
      id: corrections.id,
      playId: corrections.playId,
      gameId: corrections.gameId,
      correctedData: corrections.correctedData,
      usedForTraining: corrections.usedForTraining,
    })
    .from(corrections)
    .where(eq(corrections.correctionType, 'play_type'));

  // Also get play data to access video info
  const annotations: Array<{
    correctionId: string;
    playId: string | null;
    gameId: string | null;
    playType: string;
    videoUrl: string | null;
    clipKey: string | null;
    startTime: number | null;
    endTime: number | null;
  }> = [];

  const clipUrlCache: Record<string, string | null> = {};

  for (const correction of playTypeCorrections) {
    const correctedData = correction.correctedData as any;
    if (!correctedData?.playType) continue;

    // Build clip key - try Label Studio clip first, then standard clip path
    let clipKey: string | null = null;
    let videoUrl: string | null = null;

    // Check for Label Studio extracted clip
    if (correction.gameId && correction.playId) {
      // Try the clips directory (from Label Studio)
      const lsClipPattern = `clips/${correction.gameId}/`;

      // Standard clip path
      clipKey = `clips/${correction.gameId}/${correction.playId}.mp4`;

      if (clipUrlCache[clipKey] === undefined) {
        if (await clipExists(clipKey)) {
          clipUrlCache[clipKey] = await getPresignedUrl(clipKey);
        } else {
          clipUrlCache[clipKey] = null;
        }
      }
      videoUrl = clipUrlCache[clipKey];
    }

    // If no clip, try to get the full game video
    if (!videoUrl && correction.gameId) {
      const gameVideoKey = `games/${correction.gameId}/video.mp4`;
      if (clipUrlCache[gameVideoKey] === undefined) {
        if (await clipExists(gameVideoKey)) {
          clipUrlCache[gameVideoKey] = await getPresignedUrl(gameVideoKey);
        } else {
          clipUrlCache[gameVideoKey] = null;
        }
      }
      if (clipUrlCache[gameVideoKey]) {
        videoUrl = clipUrlCache[gameVideoKey];
        clipKey = gameVideoKey;
      }
    }

    annotations.push({
      correctionId: correction.id,
      playId: correction.playId,
      gameId: correction.gameId,
      playType: correctedData.playType,
      videoUrl,
      clipKey,
      startTime: correctedData.actualStartTime || null,
      endTime: correctedData.actualEndTime || null,
    });
  }

  // Filter to only those with video access
  const validAnnotations = annotations.filter((a) => a.videoUrl);

  // Get unique play types for class mapping
  const playTypes = [...new Set(validAnnotations.map((a) => a.playType))].sort();
  const classMapping = Object.fromEntries(playTypes.map((t, i) => [t, i]));

  // Count by play type
  const countByType: Record<string, number> = {};
  for (const ann of validAnnotations) {
    countByType[ann.playType] = (countByType[ann.playType] || 0) + 1;
  }

  return NextResponse.json({
    annotations: validAnnotations,
    classMapping,
    playTypes,
    stats: {
      totalAnnotations: validAnnotations.length,
      uniquePlayTypes: playTypes.length,
      countByType,
      unusedForTraining: playTypeCorrections.filter((a) => !a.usedForTraining).length,
      annotationsWithoutVideo: annotations.length - validAnnotations.length,
    },
  });
}
