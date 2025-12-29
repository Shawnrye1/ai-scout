import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { corrections, trainingRuns } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

/**
 * POST /api/admin/training/start
 *
 * Triggers model training on Modal.com using accumulated annotations.
 * Creates a training run record and triggers the Modal training function.
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

    // Validate based on model type
    if (model_type === 'player_detection' && stats.playerAnnotations < 10) {
      return NextResponse.json({
        error: 'Insufficient training data',
        message: `Need at least 10 player annotations, have ${stats.playerAnnotations}. Keep labeling in Label Studio!`,
        stats,
      }, { status: 400 });
    }

    if (model_type === 'play_classification' && stats.playTypeAnnotations < 10) {
      return NextResponse.json({
        error: 'Insufficient training data',
        message: `Need at least 10 play type classifications, have ${stats.playTypeAnnotations}. Keep classifying plays in the Analyze section!`,
        stats,
      }, { status: 400 });
    }

    // Set training data count based on model type
    const trainingDataCount = model_type === 'play_classification'
      ? stats.playTypeAnnotations
      : stats.playerAnnotations;

    // Check for any currently running training
    const [runningTraining] = await db
      .select()
      .from(trainingRuns)
      .where(eq(trainingRuns.status, 'training'))
      .limit(1);

    if (runningTraining) {
      return NextResponse.json({
        error: 'Training already in progress',
        message: 'Please wait for the current training to complete.',
        trainingRunId: runningTraining.id,
        stats,
      }, { status: 409 });
    }

    // Create training run record
    const [trainingRun] = await db
      .insert(trainingRuns)
      .values({
        modelType: model_type,
        status: 'queued',
        trainingDataCount,
        epochs,
        batchSize: batch_size,
        startedAt: new Date(),
        trainingConfig: { model_type, epochs, batch_size },
      })
      .returning();

    // Get the Modal training endpoint
    const modalEndpoint = process.env.MODAL_ENDPOINT;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000';

    if (!modalEndpoint) {
      // Update run to failed if no endpoint
      await db
        .update(trainingRuns)
        .set({ status: 'failed', errorMessage: 'Modal endpoint not configured' })
        .where(eq(trainingRuns.id, trainingRun.id));

      return NextResponse.json({
        success: false,
        message: 'Modal endpoint not configured. Add MODAL_ENDPOINT to your environment.',
        trainingRunId: trainingRun.id,
        stats,
      }, { status: 500 });
    }

    // Build training endpoint URL
    // Pattern: https://username--ai-scout-trigger-processing.modal.run
    // Training: https://username--ai-scout-training-trigger-training.modal.run
    const baseUrl = modalEndpoint.replace('ai-scout-trigger-processing', 'ai-scout-training-trigger-training');
    const trainingEndpoint = baseUrl;

    try {
      const response = await fetch(trainingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_url: appUrl,
          training_run_id: trainingRun.id,
          model_type,  // Route to correct training function
          epochs,
          batch_size,
        }),
      });

      if (!response.ok) {
        const error = await response.text();

        // If the training endpoint doesn't exist yet, give helpful message
        if (response.status === 404) {
          await db
            .update(trainingRuns)
            .set({ status: 'failed', errorMessage: 'Training function not deployed' })
            .where(eq(trainingRuns.id, trainingRun.id));

          return NextResponse.json({
            success: false,
            message: 'Training function not deployed yet. Run: cd ml && modal deploy train_yolo.py',
            trainingRunId: trainingRun.id,
            stats,
            help: 'This is a one-time setup. After deploying, training will work automatically.',
          }, { status: 400 });
        }

        throw new Error(`Modal training failed: ${error}`);
      }

      const result = await response.json();

      // Update training run with Modal job ID
      await db
        .update(trainingRuns)
        .set({
          status: 'training',
          modalJobId: result.training_run_id || trainingRun.id,
        })
        .where(eq(trainingRuns.id, trainingRun.id));

      return NextResponse.json({
        success: true,
        message: 'Training started on Modal! This will take 30-60 minutes.',
        trainingRunId: trainingRun.id,
        stats,
      });
    } catch (fetchError) {
      // Update run to failed
      await db
        .update(trainingRuns)
        .set({
          status: 'failed',
          errorMessage: fetchError instanceof Error ? fetchError.message : 'Failed to trigger Modal',
        })
        .where(eq(trainingRuns.id, trainingRun.id));

      throw fetchError;
    }
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

  // Count play type annotations
  const playTypeResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(corrections)
    .where(eq(corrections.correctionType, 'play_type'));

  const playTypeAnnotations = Number(playTypeResult[0]?.count || 0);

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
    playTypeAnnotations,
  };
}
