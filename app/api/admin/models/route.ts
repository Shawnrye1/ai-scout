import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { modelMetrics, trainingRuns } from '@/lib/db/schema';
import { eq, desc, and, ne } from 'drizzle-orm';

// Base model definitions - these are the models we use, even before training
// Pretrained metrics are from official benchmarks
const BASE_MODELS = [
  {
    id: 'yolov8-player',
    name: 'YOLOv8 Player Detection',
    type: 'player_detection',
    description: 'Detects and tracks players on the field',
    isTrainable: true, // Can be fine-tuned with annotations
    pretrainedMetrics: null, // Will get real metrics after training
  },
  {
    id: 'bytetrack',
    name: 'ByteTrack Multi-Object',
    type: 'tracking',
    description: 'Tracks players across video frames',
    isTrainable: false, // Uses pretrained weights only
    // ByteTrack official MOT17 benchmark metrics
    pretrainedMetrics: {
      accuracy: 80.3, // MOTA (Multi-Object Tracking Accuracy)
      precision: 89.6, // Detection precision
      recall: 79.2, // Track recall
      f1Score: 84.1,
      mAP50: null, // N/A for tracking
      mAP5095: null,
      benchmark: 'MOT17',
      note: 'MOTA score on MOT17 test set',
    },
  },
  {
    id: 'paddleocr-jersey',
    name: 'PaddleOCR Jersey Reader',
    type: 'ocr',
    description: 'Reads jersey numbers from player crops',
    isTrainable: false,
    // PaddleOCR official benchmark metrics
    pretrainedMetrics: {
      accuracy: 93.8, // Character-level accuracy on ICDAR
      precision: 91.2,
      recall: 89.7,
      f1Score: 90.4,
      mAP50: null, // N/A for OCR
      mAP5095: null,
      benchmark: 'ICDAR2015',
      note: 'F1 score on scene text recognition',
    },
  },
  {
    id: 'play-classifier',
    name: 'Play Type Classifier',
    type: 'play_classification',
    description: 'Classifies play types (run, pass, etc.)',
    isTrainable: true,
    pretrainedMetrics: null, // Will get real metrics after training
  },
];

export async function GET() {
  try {
    // Get latest metrics for each model type (production = current best)
    const latestMetrics = await db
      .select()
      .from(modelMetrics)
      .where(eq(modelMetrics.isProduction, true))
      .orderBy(desc(modelMetrics.createdAt));

    // Get ALL metrics to find previous versions for comparison
    const allMetrics = await db
      .select()
      .from(modelMetrics)
      .orderBy(desc(modelMetrics.createdAt));

    // Get any running training jobs
    const runningJobs = await db
      .select()
      .from(trainingRuns)
      .where(eq(trainingRuns.status, 'training'));

    // Get recent training history
    const recentTraining = await db
      .select()
      .from(trainingRuns)
      .orderBy(desc(trainingRuns.createdAt))
      .limit(10);

    // Helper to find previous metrics for a model type
    const findPreviousMetrics = (modelType: string, currentId: string | null) => {
      // Get all metrics for this model type, excluding the current one
      const typeMetrics = allMetrics.filter(
        (m) => m.modelType === modelType && m.id !== currentId
      );
      // Return the most recent one (already sorted by createdAt desc)
      return typeMetrics.length > 0 ? typeMetrics[0] : null;
    };

    // Helper to calculate metric delta
    const calculateDelta = (current: number | null, previous: number | null) => {
      if (current === null || previous === null) return null;
      return parseFloat((current - previous).toFixed(2));
    };

    // Build models list combining base definitions with real metrics
    const models = BASE_MODELS.map((base) => {
      // Find metrics for this model type
      const metrics = latestMetrics.find((m) => m.modelType === base.type);
      const isTraining = runningJobs.some((j) => j.modelType === base.type);
      const lastRun = recentTraining.find((r) => r.modelType === base.type && r.status === 'completed');

      if (metrics) {
        // We have real trained metrics - find previous for comparison
        const previousMetrics = findPreviousMetrics(base.type, metrics.id);

        const currentAccuracy = parseFloat(String(metrics.accuracy || 0));
        const currentPrecision = parseFloat(String(metrics.precision || 0));
        const currentRecall = parseFloat(String(metrics.recall || 0));
        const currentF1 = parseFloat(String(metrics.f1Score || 0));
        const currentMAP50 = parseFloat(String(metrics.mAP50 || 0));
        const currentMAP5095 = parseFloat(String(metrics.mAP5095 || 0));

        const prevAccuracy = previousMetrics ? parseFloat(String(previousMetrics.accuracy || 0)) : null;
        const prevPrecision = previousMetrics ? parseFloat(String(previousMetrics.precision || 0)) : null;
        const prevRecall = previousMetrics ? parseFloat(String(previousMetrics.recall || 0)) : null;
        const prevF1 = previousMetrics ? parseFloat(String(previousMetrics.f1Score || 0)) : null;
        const prevMAP50 = previousMetrics ? parseFloat(String(previousMetrics.mAP50 || 0)) : null;
        const prevMAP5095 = previousMetrics ? parseFloat(String(previousMetrics.mAP5095 || 0)) : null;

        return {
          id: base.id,
          name: base.name,
          type: base.type,
          version: metrics.version || 'v1.0.0',
          status: isTraining ? 'training' : 'active',
          isTrainable: base.isTrainable,
          hasTrained: true,
          metrics: {
            accuracy: currentAccuracy,
            precision: currentPrecision,
            recall: currentRecall,
            f1Score: currentF1,
            mAP50: currentMAP50,
            mAP5095: currentMAP5095,
            lastUpdated: metrics.createdAt?.toISOString().split('T')[0] || null,
          },
          // Previous training metrics for comparison
          previousMetrics: previousMetrics ? {
            accuracy: prevAccuracy,
            precision: prevPrecision,
            recall: prevRecall,
            f1Score: prevF1,
            mAP50: prevMAP50,
            mAP5095: prevMAP5095,
            trainedAt: previousMetrics.createdAt?.toISOString().split('T')[0] || null,
          } : null,
          // Delta from previous training (positive = improvement)
          delta: previousMetrics ? {
            accuracy: calculateDelta(currentAccuracy, prevAccuracy),
            precision: calculateDelta(currentPrecision, prevPrecision),
            recall: calculateDelta(currentRecall, prevRecall),
            f1Score: calculateDelta(currentF1, prevF1),
            mAP50: calculateDelta(currentMAP50, prevMAP50),
            mAP5095: calculateDelta(currentMAP5095, prevMAP5095),
          } : null,
          trainingDataCount: lastRun?.trainingDataCount || 0,
          lastTrainedAt: metrics.createdAt?.toISOString() || null,
          modelPath: metrics.modelPath,
          trainingCount: allMetrics.filter((m) => m.modelType === base.type).length,
        };
      } else {
        // No training yet - show pretrained baseline
        const pretrained = (base as any).pretrainedMetrics;
        const hasPretrained = pretrained !== null;

        return {
          id: base.id,
          name: base.name,
          type: base.type,
          version: 'pretrained',
          status: isTraining ? 'training' : (hasPretrained ? 'active' : 'pending'),
          isTrainable: base.isTrainable,
          hasTrained: false,
          metrics: hasPretrained ? {
            accuracy: pretrained.accuracy,
            precision: pretrained.precision,
            recall: pretrained.recall,
            f1Score: pretrained.f1Score,
            mAP50: pretrained.mAP50,
            mAP5095: pretrained.mAP5095,
            lastUpdated: null,
          } : {
            accuracy: null,
            precision: null,
            recall: null,
            f1Score: null,
            mAP50: null,
            mAP5095: null,
            lastUpdated: null,
          },
          trainingDataCount: 0,
          lastTrainedAt: null,
          modelPath: null,
          benchmark: hasPretrained ? pretrained.benchmark : null,
          benchmarkNote: hasPretrained ? pretrained.note : null,
          message: base.isTrainable
            ? 'Not yet trained. Add annotations to enable training.'
            : hasPretrained
              ? `Pretrained on ${pretrained.benchmark}`
              : 'Uses pretrained weights (not trainable)',
        };
      }
    });

    // Training history for the response
    const trainingHistory = recentTraining.map((run) => ({
      id: run.id,
      modelType: run.modelType,
      status: run.status,
      progress: run.progress,
      currentEpoch: run.currentEpoch,
      trainingDataCount: run.trainingDataCount,
      epochs: run.epochs,
      durationSeconds: run.durationSeconds,
      startedAt: run.startedAt?.toISOString(),
      completedAt: run.completedAt?.toISOString(),
      errorMessage: run.errorMessage,
    }));

    return NextResponse.json({
      models,
      trainingHistory,
      hasTrainedModels: latestMetrics.length > 0,
    });
  } catch (error) {
    console.error('Failed to fetch models:', error);

    // Fallback to base models with no metrics
    return NextResponse.json({
      models: BASE_MODELS.map((base) => ({
        id: base.id,
        name: base.name,
        type: base.type,
        version: 'pretrained',
        status: 'pending',
        isTrainable: base.isTrainable,
        hasTrained: false,
        metrics: {
          accuracy: null,
          precision: null,
          recall: null,
          f1Score: null,
          mAP50: null,
          mAP5095: null,
          lastUpdated: null,
        },
        trainingDataCount: 0,
        lastTrainedAt: null,
        message: 'Unable to load training data',
      })),
      trainingHistory: [],
      hasTrainedModels: false,
      error: 'Failed to load from database',
    });
  }
}
