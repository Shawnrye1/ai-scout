import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { corrections, detectedPlays, games } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Training Data Export API
 *
 * This endpoint exports corrections in a format suitable for model training.
 *
 * Human-in-the-Loop Learning Flow:
 * 1. AI detects plays with confidence scores
 * 2. Low-confidence plays go to correction queue
 * 3. Humans correct play types, boundaries, events
 * 4. This endpoint exports corrections for training
 * 5. ML pipeline uses data to fine-tune models
 * 6. Corrections marked as used (usedForTraining = true)
 */

// GET /api/admin/training - Export training data
export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'json';
  const includeUsed = request.nextUrl.searchParams.get('include_used') === 'true';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '1000');

  try {
    // Build where clause
    const whereClause = includeUsed ? undefined : eq(corrections.usedForTraining, false);

    // Get corrections with related data
    const allCorrections = await db
      .select({
        // Correction data
        correctionId: corrections.id,
        playId: corrections.playId,
        gameId: corrections.gameId,
        originalData: corrections.originalData,
        correctedData: corrections.correctedData,
        correctionType: corrections.correctionType,
        notes: corrections.notes,
        usedForTraining: corrections.usedForTraining,
        createdAt: corrections.createdAt,
        // Play data
        playNumber: detectedPlays.playNumber,
        originalPlayType: detectedPlays.playType,
        startTimestamp: detectedPlays.startTimestamp,
        endTimestamp: detectedPlays.endTimestamp,
        originalConfidence: detectedPlays.confidence,
        formation: detectedPlays.formation,
        // Game data
        videoUrl: games.videoUrl,
        videoKey: games.videoKey,
        sport: games.sport,
      })
      .from(corrections)
      .leftJoin(detectedPlays, eq(detectedPlays.id, corrections.playId))
      .leftJoin(games, eq(games.id, corrections.gameId))
      .where(whereClause)
      .limit(limit);

    // Transform into training format
    const trainingData = allCorrections.map((c) => {
      const correctedData = c.correctedData as any || {};
      const originalData = c.originalData as any || {};

      return {
        // Identifiers
        correction_id: c.correctionId,
        play_id: c.playId,
        game_id: c.gameId,

        // Video reference
        video_url: c.videoUrl,
        video_key: c.videoKey,
        sport: c.sport,

        // Temporal boundaries (training target for segmentation)
        original_start: c.startTimestamp ? parseFloat(String(c.startTimestamp)) : null,
        original_end: c.endTimestamp ? parseFloat(String(c.endTimestamp)) : null,
        corrected_start: correctedData.actualStartTime || null,
        corrected_end: correctedData.actualEndTime || null,
        split_points: correctedData.splitPoints
          ? correctedData.splitPoints.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n))
          : [],

        // Play classification (training target for play type model)
        original_play_type: c.originalPlayType || originalData.playType,
        corrected_play_type: correctedData.playType || null,
        original_formation: c.formation,
        corrected_formation: correctedData.formation || null,

        // Confidence (helps with active learning)
        original_confidence: c.originalConfidence ? parseFloat(String(c.originalConfidence)) : null,

        // Events (training targets for event detection)
        events: correctedData.events || {},
        has_multiple_plays: correctedData.hasMultiplePlays || false,

        // Player annotations from Label Studio (training targets for player detection)
        player_annotations: correctedData.players || null,
        player_annotation_count: correctedData.players?.length || 0,

        // Natural language description (for future LLM training)
        description: correctedData.description || null,
        notes: c.notes || null,

        // Metadata
        correction_type: c.correctionType,
        created_at: c.createdAt,
        used_for_training: c.usedForTraining,
      };
    });

    // Statistics
    const stats = {
      total_corrections: trainingData.length,
      unused_corrections: trainingData.filter((d) => !d.used_for_training).length,
      with_boundary_corrections: trainingData.filter((d) => d.corrected_start || d.corrected_end).length,
      with_split_points: trainingData.filter((d) => d.split_points.length > 0).length,
      with_play_type_corrections: trainingData.filter((d) => d.corrected_play_type).length,
      with_event_labels: trainingData.filter((d) => Object.keys(d.events).length > 0).length,
      with_descriptions: trainingData.filter((d) => d.description).length,
      with_player_annotations: trainingData.filter((d) => d.player_annotation_count > 0).length,
      total_player_bboxes: trainingData.reduce((sum, d) => sum + d.player_annotation_count, 0),
      by_sport: {
        basketball: trainingData.filter((d) => d.sport === 'basketball').length,
        football: trainingData.filter((d) => d.sport === 'football').length,
      },
      by_correction_type: {
        player_annotation: trainingData.filter((d) => d.correction_type === 'player_annotation').length,
        play_boundary: trainingData.filter((d) => d.correction_type === 'play_boundary').length,
        play_type: trainingData.filter((d) => d.correction_type === 'play_type').length,
        play_added: trainingData.filter((d) => d.correction_type === 'play_added').length,
      },
    };

    if (format === 'csv') {
      // Export as CSV for tools like pandas
      const headers = [
        'correction_id', 'play_id', 'game_id', 'sport',
        'original_start', 'original_end', 'corrected_start', 'corrected_end',
        'original_play_type', 'corrected_play_type', 'original_confidence',
        'has_multiple_plays', 'description'
      ];
      const csvRows = [headers.join(',')];

      for (const d of trainingData) {
        csvRows.push([
          d.correction_id,
          d.play_id || '',
          d.game_id,
          d.sport || '',
          d.original_start || '',
          d.original_end || '',
          d.corrected_start || '',
          d.corrected_end || '',
          d.original_play_type || '',
          d.corrected_play_type || '',
          d.original_confidence || '',
          d.has_multiple_plays ? '1' : '0',
          `"${(d.description || '').replace(/"/g, '""')}"`,
        ].join(','));
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="training_data.csv"',
        },
      });
    }

    return NextResponse.json({
      training_data: trainingData,
      statistics: stats,
      export_timestamp: new Date().toISOString(),
      format: 'json',
    });
  } catch (error) {
    console.error('Failed to export training data:', error);
    return NextResponse.json({ error: 'Failed to export training data' }, { status: 500 });
  }
}

// POST /api/admin/training - Mark corrections as used for training
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correction_ids, mark_all_exported } = body;

    if (mark_all_exported) {
      // Mark all unused corrections as used
      const result = await db
        .update(corrections)
        .set({ usedForTraining: true })
        .where(eq(corrections.usedForTraining, false));

      return NextResponse.json({
        success: true,
        message: 'Marked all exported corrections as used for training',
      });
    }

    if (!correction_ids || !Array.isArray(correction_ids)) {
      return NextResponse.json(
        { error: 'correction_ids array required' },
        { status: 400 }
      );
    }

    // Mark specific corrections as used
    for (const id of correction_ids) {
      await db
        .update(corrections)
        .set({ usedForTraining: true })
        .where(eq(corrections.id, id));
    }

    return NextResponse.json({
      success: true,
      marked_count: correction_ids.length,
    });
  } catch (error) {
    console.error('Failed to mark training data:', error);
    return NextResponse.json({ error: 'Failed to mark training data' }, { status: 500 });
  }
}
