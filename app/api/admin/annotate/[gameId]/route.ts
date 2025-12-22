import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlays, detectedTeams, detectedPlayers } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getDownloadPresignedUrl } from '@/lib/storage/r2';

/**
 * Get Full Game Data for Annotation
 *
 * Returns all plays, coverage info, and game metadata
 * for the full-timeline annotation interface.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Get game info
    const [game] = await db
      .select({
        id: games.id,
        name: games.name,
        title: games.title,
        sport: games.sport,
        videoUrl: games.videoUrl,
        videoKey: games.videoKey,
        videoDuration: games.videoDurationSeconds,
        annotationStatus: games.annotationStatus,
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
        playType: detectedPlays.playType,
        formation: detectedPlays.formation,
        confidence: detectedPlays.confidence,
        needsReview: detectedPlays.needsReview,
        possessionTeamId: detectedPlays.possessionTeamId,
        shotAttempted: detectedPlays.shotAttempted,
        shotMade: detectedPlays.shotMade,
        turnover: detectedPlays.turnover,
      })
      .from(detectedPlays)
      .where(eq(detectedPlays.gameId, gameId))
      .orderBy(sql`CAST(${detectedPlays.startTimestamp} AS DECIMAL)`);

    // Convert plays to proper format
    const formattedPlays = plays.map((p) => ({
      id: p.id,
      playNumber: p.playNumber,
      startTimestamp: parseFloat(p.startTimestamp?.toString() || '0'),
      endTimestamp: parseFloat(p.endTimestamp?.toString() || '0'),
      playType: p.playType,
      formation: p.formation,
      confidence: parseFloat(p.confidence?.toString() || '0'),
      needsReview: p.needsReview,
      possessionTeamId: p.possessionTeamId,
      shotAttempted: p.shotAttempted,
      shotMade: p.shotMade,
      turnover: p.turnover,
    }));

    // Calculate coverage
    const videoDuration = game.videoDuration || 0;
    let coveredTime = 0;
    const gaps: { startTime: number; endTime: number; duration: number }[] = [];
    const overlaps: { play1: number | null; play2: number | null; overlapSeconds: number }[] = [];

    // Check for gap at start
    if (formattedPlays.length > 0 && formattedPlays[0].startTimestamp > 1) {
      gaps.push({
        startTime: 0,
        endTime: formattedPlays[0].startTimestamp,
        duration: formattedPlays[0].startTimestamp,
      });
    }

    for (let i = 0; i < formattedPlays.length; i++) {
      const play = formattedPlays[i];
      coveredTime += play.endTimestamp - play.startTimestamp;

      if (i < formattedPlays.length - 1) {
        const next = formattedPlays[i + 1];
        const gapDuration = next.startTimestamp - play.endTimestamp;

        if (gapDuration > 0.5) {
          gaps.push({
            startTime: play.endTimestamp,
            endTime: next.startTimestamp,
            duration: gapDuration,
          });
        } else if (gapDuration < -0.1) {
          // Overlap
          overlaps.push({
            play1: play.playNumber,
            play2: next.playNumber,
            overlapSeconds: Math.abs(gapDuration),
          });
        }
      }
    }

    // Check for gap at end
    if (videoDuration > 0 && formattedPlays.length > 0) {
      const lastPlay = formattedPlays[formattedPlays.length - 1];
      if (videoDuration - lastPlay.endTimestamp > 5) {
        gaps.push({
          startTime: lastPlay.endTimestamp,
          endTime: videoDuration,
          duration: videoDuration - lastPlay.endTimestamp,
        });
      }
    }

    const uncoveredTime = gaps.reduce((sum, g) => sum + g.duration, 0);
    const coveragePercentage = videoDuration > 0
      ? Math.round((coveredTime / videoDuration) * 100)
      : (formattedPlays.length > 0 ? 100 : 0);

    // Get teams
    const teams = await db
      .select({
        id: detectedTeams.id,
        teamLabel: detectedTeams.teamLabel,
        teamName: detectedTeams.teamName,
        primaryJerseyColor: detectedTeams.primaryJerseyColor,
        isUserTeam: detectedTeams.isUserTeam,
      })
      .from(detectedTeams)
      .where(eq(detectedTeams.gameId, gameId));

    // Get detected players
    const playersRaw = await db
      .select({
        id: detectedPlayers.id,
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
        positionGuess: detectedPlayers.positionGuess,
        detectedTeamId: detectedPlayers.detectedTeamId,
        thumbnailUrl: detectedPlayers.thumbnailUrl,
      })
      .from(detectedPlayers)
      .where(eq(detectedPlayers.gameId, gameId));

    // Sort players by jersey number (client-side for reliability)
    const players = playersRaw.sort((a, b) => {
      const numA = parseInt(a.jerseyNumber?.replace(/\D/g, '') || '999');
      const numB = parseInt(b.jerseyNumber?.replace(/\D/g, '') || '999');
      return numA - numB;
    });

    // Generate presigned URL for video if stored in R2
    let videoUrl = game.videoUrl;
    if (game.videoKey) {
      try {
        videoUrl = await getDownloadPresignedUrl(game.videoKey, 3600 * 4); // 4 hour expiry
      } catch (e) {
        console.error('Failed to generate presigned URL:', e);
      }
    }

    return NextResponse.json({
      game: {
        id: game.id,
        name: game.name,
        title: game.title,
        sport: game.sport || 'football',
        videoUrl,
        videoKey: game.videoKey,
        videoDuration,
        annotationStatus: game.annotationStatus || 'pending',
      },
      plays: formattedPlays,
      coverage: {
        coveredTime: Math.round(coveredTime * 10) / 10,
        uncoveredTime: Math.round(uncoveredTime * 10) / 10,
        percentage: coveragePercentage,
        gaps,
        overlaps,
      },
      teams,
      players,
    });
  } catch (error) {
    console.error('Failed to fetch game for annotation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}

/**
 * Update game annotation status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { annotationStatus } = body;

    if (!['pending', 'in_progress', 'reviewed'].includes(annotationStatus)) {
      return NextResponse.json(
        { error: 'Invalid annotation status' },
        { status: 400 }
      );
    }

    await db
      .update(games)
      .set({
        annotationStatus,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update annotation status:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
