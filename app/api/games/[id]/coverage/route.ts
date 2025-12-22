import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { detectedPlays, games } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Game Coverage API
 *
 * Analyzes play coverage for a game to ensure no gaps exist.
 * Returns:
 * - Total video duration
 * - Time covered by plays
 * - Gaps (uncovered segments)
 * - Coverage percentage
 */

interface Gap {
  startTime: number;
  endTime: number;
  duration: number;
  afterPlayNumber: number | null;
  beforePlayNumber: number | null;
}

interface PlaySegment {
  id: string;
  playNumber: number | null;
  startTime: number;
  endTime: number;
  duration: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    // Get game info
    const [game] = await db
      .select({
        id: games.id,
        videoDuration: games.videoDurationSeconds,
        name: games.name,
        title: games.title,
      })
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get all plays ordered by start time
    const plays = await db
      .select({
        id: detectedPlays.id,
        playNumber: detectedPlays.playNumber,
        startTimestamp: detectedPlays.startTimestamp,
        endTimestamp: detectedPlays.endTimestamp,
      })
      .from(detectedPlays)
      .where(eq(detectedPlays.gameId, gameId))
      .orderBy(sql`CAST(${detectedPlays.startTimestamp} AS DECIMAL)`);

    if (plays.length === 0) {
      return NextResponse.json({
        gameId,
        gameName: game.name || game.title,
        videoDuration: game.videoDuration || 0,
        totalPlays: 0,
        segments: [],
        gaps: [],
        coverage: {
          coveredTime: 0,
          uncoveredTime: game.videoDuration || 0,
          percentage: 0,
        },
      });
    }

    // Convert plays to segments
    const segments: PlaySegment[] = plays.map((p) => {
      const start = parseFloat(p.startTimestamp?.toString() || '0');
      const end = parseFloat(p.endTimestamp?.toString() || '0');
      return {
        id: p.id,
        playNumber: p.playNumber,
        startTime: start,
        endTime: end,
        duration: end - start,
      };
    });

    // Find gaps between plays
    const gaps: Gap[] = [];
    const videoDuration = game.videoDuration || 0;

    // Check for gap at the beginning (before first play)
    if (segments.length > 0 && segments[0].startTime > 1) {
      gaps.push({
        startTime: 0,
        endTime: segments[0].startTime,
        duration: segments[0].startTime,
        afterPlayNumber: null,
        beforePlayNumber: segments[0].playNumber,
      });
    }

    // Check for gaps between plays
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      const gapStart = current.endTime;
      const gapEnd = next.startTime;
      const gapDuration = gapEnd - gapStart;

      // Consider it a gap if > 0.5 seconds
      if (gapDuration > 0.5) {
        gaps.push({
          startTime: gapStart,
          endTime: gapEnd,
          duration: gapDuration,
          afterPlayNumber: current.playNumber,
          beforePlayNumber: next.playNumber,
        });
      }
    }

    // Check for gap at the end (after last play)
    if (videoDuration > 0 && segments.length > 0) {
      const lastPlay = segments[segments.length - 1];
      if (videoDuration - lastPlay.endTime > 5) {
        // > 5 seconds at end
        gaps.push({
          startTime: lastPlay.endTime,
          endTime: videoDuration,
          duration: videoDuration - lastPlay.endTime,
          afterPlayNumber: lastPlay.playNumber,
          beforePlayNumber: null,
        });
      }
    }

    // Calculate coverage
    const coveredTime = segments.reduce((sum, s) => sum + s.duration, 0);
    const uncoveredTime = gaps.reduce((sum, g) => sum + g.duration, 0);
    const totalAccountedTime = coveredTime + uncoveredTime;
    const percentage = videoDuration > 0
      ? Math.round((coveredTime / videoDuration) * 100)
      : (segments.length > 0 ? 100 : 0);

    // Check for overlaps
    const overlaps: { play1: number | null; play2: number | null; overlapSeconds: number }[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      if (current.endTime > next.startTime) {
        overlaps.push({
          play1: current.playNumber,
          play2: next.playNumber,
          overlapSeconds: current.endTime - next.startTime,
        });
      }
    }

    return NextResponse.json({
      gameId,
      gameName: game.name || game.title,
      videoDuration,
      totalPlays: segments.length,
      segments,
      gaps,
      overlaps,
      coverage: {
        coveredTime: Math.round(coveredTime * 10) / 10,
        uncoveredTime: Math.round(uncoveredTime * 10) / 10,
        percentage,
      },
    });
  } catch (error) {
    console.error('Coverage analysis failed:', error);
    return NextResponse.json(
      { error: 'Failed to analyze coverage' },
      { status: 500 }
    );
  }
}
