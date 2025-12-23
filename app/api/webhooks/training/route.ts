import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { trainingRuns, modelMetrics, corrections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.MODAL_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/training
 *
 * Webhook endpoint for receiving training updates from Modal.
 * Handles progress updates, completion, and failure notifications.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('X-Webhook-Signature');

    // Verify signature if secret is set
    if (WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const { type, trainingRunId } = payload;

    if (!trainingRunId) {
      return NextResponse.json({ error: 'trainingRunId required' }, { status: 400 });
    }

    console.log(`Training webhook: ${type} for run ${trainingRunId}`);

    switch (type) {
      case 'progress':
        await handleProgress(trainingRunId, payload);
        break;

      case 'completed':
        await handleCompletion(trainingRunId, payload);
        break;

      case 'failed':
        await handleFailure(trainingRunId, payload);
        break;

      default:
        console.warn(`Unknown webhook type: ${type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Training webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleProgress(trainingRunId: string, payload: any) {
  const { status, progress } = payload;

  await db
    .update(trainingRuns)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(trainingRuns.id, trainingRunId));

  console.log(`Training ${trainingRunId}: ${status} (${progress}%)`);
}

async function handleCompletion(trainingRunId: string, payload: any) {
  const {
    version,
    trainingDataCount,
    durationSeconds,
    metrics,
    modelPath,
    modelSizeBytes,
  } = payload;

  const now = new Date();

  // Update training run
  await db
    .update(trainingRuns)
    .set({
      status: 'completed',
      completedAt: now,
      durationSeconds,
      trainingDataCount,
      updatedAt: now,
    })
    .where(eq(trainingRuns.id, trainingRunId));

  // Get the training run to get model type
  const [run] = await db
    .select()
    .from(trainingRuns)
    .where(eq(trainingRuns.id, trainingRunId))
    .limit(1);

  if (run) {
    // Set all existing models of this type to not production
    await db
      .update(modelMetrics)
      .set({ isProduction: false })
      .where(eq(modelMetrics.modelType, run.modelType));

    // Insert new model metrics
    await db.insert(modelMetrics).values({
      trainingRunId,
      modelType: run.modelType,
      version: version || `v1.0.${Date.now() % 10000}`,
      accuracy: metrics?.accuracy || metrics?.mAP50,
      precision: metrics?.precision,
      recall: metrics?.recall,
      f1Score: metrics?.f1Score,
      mAP50: metrics?.mAP50,
      mAP5095: metrics?.mAP5095,
      trainingLoss: metrics?.trainingLoss,
      validationLoss: metrics?.validationLoss,
      modelPath,
      modelSizeBytes,
      isProduction: true, // New model becomes production
      deployedAt: now,
      classMetrics: metrics?.classMetrics,
    });

    // Mark corrections as used for training
    await db
      .update(corrections)
      .set({ usedForTraining: true })
      .where(eq(corrections.correctionType, 'player_annotation'));

    console.log(`Training ${trainingRunId} completed: mAP50=${metrics?.mAP50?.toFixed(1)}%`);
  }
}

async function handleFailure(trainingRunId: string, payload: any) {
  const { error } = payload;

  await db
    .update(trainingRuns)
    .set({
      status: 'failed',
      errorMessage: error,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(trainingRuns.id, trainingRunId));

  console.error(`Training ${trainingRunId} failed: ${error}`);
}
