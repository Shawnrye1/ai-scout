import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { corrections } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * POST /api/admin/training/start
 *
 * Triggers model training on Modal.com using accumulated annotations.
 * Uses Modal's existing endpoint (same one used for video processing).
 *
 * Body: {
 *   model_type: 'player_detection' | 'play_segmentation' | 'play_classification',
 *   epochs?: number,
 *   batch_size?: number,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      model_type = 'player_detection',
      epochs = 50,
      batch_size = 16,
    } = body;

    // Get training statistics first
    const stats = await getTrainingStats();

    if (model_type === 'player_detection' && stats.playerAnnotations < 10) {
      return NextResponse.json({
        error: 'Insufficient training data',
        message: `Need at least 10 player annotations, have ${stats.playerAnnotations}. Keep labeling in Label Studio!`,
        stats,
      }, { status: 400 });
    }

    // Use the existing Modal endpoint for training
    const modalEndpoint = process.env.MODAL_ENDPOINT;

    if (!modalEndpoint) {
      return NextResponse.json({
        success: false,
        message: 'Modal endpoint not configured. Add MODAL_ENDPOINT to your environment.',
        stats,
      }, { status: 500 });
    }

    // Trigger training on Modal using the training endpoint
    // The Modal endpoint pattern is: base-url but we need the training function
    const trainingEndpoint = modalEndpoint.replace('trigger-processing', 'train-player-detection');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000';

    const response = await fetch(trainingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_url: appUrl,
        epochs,
        batch_size,
      }),
    });

    if (!response.ok) {
      const error = await response.text();

      // If the training endpoint doesn't exist yet, give helpful message
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          message: 'Training function not deployed yet. Run: cd ml && modal deploy train_yolo.py',
          stats,
          help: 'This is a one-time setup. After deploying, training will work automatically.',
        }, { status: 400 });
      }

      throw new Error(`Modal training failed: ${error}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Training started on Modal! This will take 30-60 minutes.',
      job_id: result.job_id,
      stats,
    });
  } catch (error) {
    console.error('Failed to start training:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start training' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/training/start
 *
 * Get training readiness stats.
 */
export async function GET() {
  try {
    const stats = await getTrainingStats();

    const recommendations = [];

    if (stats.playerAnnotations < 100) {
      recommendations.push(`Label more players in Label Studio (have ${stats.playerAnnotations}, recommend 100+)`);
    }
    if (stats.playerAnnotations >= 100 && stats.playerAnnotations < 500) {
      recommendations.push('Good progress! 500+ annotations will give best results.');
    }
    if (stats.playerAnnotations >= 500) {
      recommendations.push('Excellent! Ready for effective training.');
    }

    return NextResponse.json({
      ready: stats.playerAnnotations >= 10,
      stats,
      recommendations,
    });
  } catch (error) {
    console.error('Failed to get training stats:', error);
    return NextResponse.json(
      { error: 'Failed to get training stats' },
      { status: 500 }
    );
  }
}

async function getTrainingStats() {
  // Count player annotations
  const playerAnnotationResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(corrections)
    .where(eq(corrections.correctionType, 'player_annotation'));

  const playerAnnotations = Number(playerAnnotationResult[0]?.count || 0);

  // Count total corrections
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(corrections);

  const totalCorrections = Number(totalResult[0]?.count || 0);

  // Count unused corrections
  const unusedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(corrections)
    .where(eq(corrections.usedForTraining, false));

  const unusedCorrections = Number(unusedResult[0]?.count || 0);

  return {
    totalCorrections,
    unusedCorrections,
    playerAnnotations,
  };
}
