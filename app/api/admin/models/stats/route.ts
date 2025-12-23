import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { corrections, trainingRuns, modelMetrics } from '@/lib/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total corrections count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(corrections);

    // Get unused corrections count
    const [unusedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(corrections)
      .where(eq(corrections.usedForTraining, false));

    // Get player annotation count (what we need for training)
    const [playerAnnotationResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(corrections)
      .where(eq(corrections.correctionType, 'player_annotation'));

    // Get last exported correction
    const [lastExportResult] = await db
      .select({ createdAt: corrections.createdAt })
      .from(corrections)
      .where(eq(corrections.usedForTraining, true))
      .orderBy(sql`${corrections.createdAt} DESC`)
      .limit(1);

    // Get last training run
    const [lastTrainingRun] = await db
      .select()
      .from(trainingRuns)
      .where(eq(trainingRuns.status, 'completed'))
      .orderBy(desc(trainingRuns.completedAt))
      .limit(1);

    // Get currently running training
    const [runningTraining] = await db
      .select()
      .from(trainingRuns)
      .where(eq(trainingRuns.status, 'training'))
      .limit(1);

    // Get latest model metrics
    const [latestMetrics] = await db
      .select()
      .from(modelMetrics)
      .where(and(
        eq(modelMetrics.modelType, 'player_detection'),
        eq(modelMetrics.isProduction, true)
      ))
      .limit(1);

    const playerAnnotations = playerAnnotationResult?.count || 0;
    const minAnnotationsRequired = 10;
    const recommendedAnnotations = 100;

    return NextResponse.json({
      totalCorrections: totalResult?.count || 0,
      unusedCorrections: unusedResult?.count || 0,
      playerAnnotations,
      minAnnotationsRequired,
      recommendedAnnotations,
      canTrain: playerAnnotations >= minAnnotationsRequired,
      trainingProgress: Math.min(100, Math.round((playerAnnotations / minAnnotationsRequired) * 100)),
      annotationsNeeded: Math.max(0, minAnnotationsRequired - playerAnnotations),
      lastExport: lastExportResult?.createdAt || null,
      lastTrainingRun: lastTrainingRun ? {
        id: lastTrainingRun.id,
        status: lastTrainingRun.status,
        completedAt: lastTrainingRun.completedAt,
        trainingDataCount: lastTrainingRun.trainingDataCount,
        durationSeconds: lastTrainingRun.durationSeconds,
      } : null,
      isTraining: !!runningTraining,
      runningTrainingId: runningTraining?.id || null,
      currentMetrics: latestMetrics ? {
        accuracy: parseFloat(String(latestMetrics.accuracy || 0)),
        precision: parseFloat(String(latestMetrics.precision || 0)),
        recall: parseFloat(String(latestMetrics.recall || 0)),
        f1Score: parseFloat(String(latestMetrics.f1Score || 0)),
        mAP50: parseFloat(String(latestMetrics.mAP50 || 0)),
        version: latestMetrics.version,
      } : null,
    });
  } catch (error) {
    console.error('Failed to fetch model stats:', error);
    return NextResponse.json({
      totalCorrections: 0,
      unusedCorrections: 0,
      playerAnnotations: 0,
      minAnnotationsRequired: 10,
      recommendedAnnotations: 100,
      canTrain: false,
      trainingProgress: 0,
      annotationsNeeded: 10,
      lastExport: null,
      lastTrainingRun: null,
      isTraining: false,
      runningTrainingId: null,
      currentMetrics: null,
    });
  }
}
