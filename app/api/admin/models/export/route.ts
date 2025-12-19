import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { corrections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    // Get all unused corrections
    const unusedCorrections = await db
      .select()
      .from(corrections)
      .where(eq(corrections.usedForTraining, false));

    if (unusedCorrections.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No new corrections to export',
      });
    }

    // Format data for training
    const trainingData = unusedCorrections.map((correction) => ({
      id: correction.id,
      playId: correction.playId,
      gameId: correction.gameId,
      original: correction.originalData,
      corrected: correction.correctedData,
      type: correction.correctionType,
      notes: correction.notes,
      createdAt: correction.createdAt,
    }));

    // Mark as exported
    for (const correction of unusedCorrections) {
      await db
        .update(corrections)
        .set({ usedForTraining: true })
        .where(eq(corrections.id, correction.id));
    }

    // In production, you would upload this to R2 or return a presigned URL
    // For now, we'll return the data directly
    const exportData = {
      exportedAt: new Date().toISOString(),
      count: trainingData.length,
      data: trainingData,
    };

    // Create a data URL for download
    const jsonString = JSON.stringify(exportData, null, 2);
    const base64 = Buffer.from(jsonString).toString('base64');
    const downloadUrl = `data:application/json;base64,${base64}`;

    return NextResponse.json({
      success: true,
      count: trainingData.length,
      downloadUrl,
    });
  } catch (error) {
    console.error('Failed to export training data:', error);
    return NextResponse.json(
      { error: 'Failed to export training data' },
      { status: 500 }
    );
  }
}
