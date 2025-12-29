import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlays, corrections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RejectionContext {
  reason: string;
  correctType?: string | null;
  correctTeam?: 'home' | 'away' | null;
  correctJersey?: number | null;
  notes?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { eventId, action, context } = await request.json() as {
      eventId: string;
      action: 'verify' | 'reject';
      context?: RejectionContext;
    };

    if (!eventId || !action) {
      return NextResponse.json({ error: 'Missing eventId or action' }, { status: 400 });
    }

    // Event ID format: either a UUID (from detectedPlays) or "gameId-index" (from geminiAnalysis)
    const isPlayId = eventId.length === 36 && !eventId.includes('-0') && !eventId.includes('-1');

    if (isPlayId || eventId.length === 36) {
      // It's a detectedPlays record
      const play = await db
        .select()
        .from(detectedPlays)
        .where(eq(detectedPlays.id, eventId))
        .limit(1);

      if (play.length > 0) {
        // Update the play
        await db
          .update(detectedPlays)
          .set({
            needsReview: false,
            flagReason: action === 'verify'
              ? 'Human verified'
              : `Human rejected: ${context?.reason || 'no reason'}`,
          })
          .where(eq(detectedPlays.id, eventId));

        // Save correction for training - include rejection context
        const correctedData: any = {
          action,
          humanVerified: true,
          originalEvent: play[0].rawData,
        };

        if (action === 'reject' && context) {
          correctedData.rejectionReason = context.reason;
          correctedData.correctType = context.correctType;
          correctedData.correctTeam = context.correctTeam;
          correctedData.correctJersey = context.correctJersey;
        }

        await db.insert(corrections).values({
          playId: eventId,
          gameId: play[0].gameId,
          originalData: play[0].rawData,
          correctedData,
          correctedBy: 'admin',
          correctionType: action === 'verify' ? 'verified' : `rejected_${context?.reason || 'unknown'}`,
          notes: context?.notes || `Human ${action === 'verify' ? 'verified' : 'rejected'} this event`,
        });

        return NextResponse.json({ success: true, source: 'detectedPlays' });
      }
    }

    // It's from geminiAnalysis (format: gameId-index)
    const [gameId, indexStr] = eventId.split('-').length > 5
      ? [eventId.substring(0, 36), eventId.substring(37)]
      : eventId.split('-');
    const index = parseInt(indexStr);

    if (!gameId || isNaN(index)) {
      return NextResponse.json({ error: 'Invalid event ID format' }, { status: 400 });
    }

    // Get the game
    const gameResult = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (gameResult.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = gameResult[0];
    const analysis = game.geminiAnalysis as any;

    if (!analysis || !analysis.humanReviewQueue) {
      return NextResponse.json({ error: 'No review queue found' }, { status: 404 });
    }

    const event = analysis.humanReviewQueue[index];
    if (!event) {
      return NextResponse.json({ error: 'Event not found in queue' }, { status: 404 });
    }

    // Save correction for training - include rejection context
    const correctedData: any = {
      action,
      humanVerified: true,
      originalEvent: event,
    };

    if (action === 'reject' && context) {
      correctedData.rejectionReason = context.reason;
      correctedData.correctType = context.correctType;
      correctedData.correctTeam = context.correctTeam;
      correctedData.correctJersey = context.correctJersey;
    }

    await db.insert(corrections).values({
      gameId: gameId,
      originalData: event,
      correctedData,
      correctedBy: 'admin',
      correctionType: action === 'verify' ? 'verified' : `rejected_${context?.reason || 'unknown'}`,
      notes: context?.notes || `Human ${action === 'verify' ? 'verified' : 'rejected'} ${event.type} at ${event.timestamp}`,
    });

    // Remove from review queue and add to verified events if approved
    const newReviewQueue = analysis.humanReviewQueue.filter((_: any, i: number) => i !== index);
    const newVerifiedEvents = [...(analysis.verifiedEvents || [])];

    if (action === 'verify') {
      newVerifiedEvents.push({
        ...event,
        verificationMethod: 'human',
        humanVerified: true,
      });

      // Check if this is a scoring event
      if (event.type === 'scoring' && event.points) {
        // Add to verified scoring events and update score
        const scoring = analysis.scoring || { home: 0, away: 0, verifiedEvents: [], reviewQueue: [] };
        scoring.verifiedEvents = scoring.verifiedEvents || [];
        scoring.verifiedEvents.push({
          ...event,
          verified: true,
          verificationMethod: 'human',
        });

        // Update the score
        if (event.team === 'home') {
          scoring.home = (scoring.home || 0) + event.points;
        } else {
          scoring.away = (scoring.away || 0) + event.points;
        }

        // Remove from scoring review queue
        if (scoring.reviewQueue) {
          scoring.reviewQueue = scoring.reviewQueue.filter(
            (e: any) => e.timestampSeconds !== event.timestampSeconds
          );
        }

        analysis.scoring = scoring;
      } else {
        // Update stats for non-scoring events
        const stats = analysis.stats || { home: { rebounds: 0, steals: 0, blocks: 0, turnovers: 0, assists: 0 }, away: { rebounds: 0, steals: 0, blocks: 0, turnovers: 0, assists: 0 } };
        const teamStats = stats[event.team];
        if (teamStats && event.type in teamStats) {
          teamStats[event.type as keyof typeof teamStats]++;
        }
        analysis.stats = stats;
      }
    } else if (action === 'reject' && event.type === 'scoring') {
      // For rejected scoring events, just remove from review queue (don't add points)
      const scoring = analysis.scoring || { home: 0, away: 0, verifiedEvents: [], reviewQueue: [] };
      if (scoring.reviewQueue) {
        scoring.reviewQueue = scoring.reviewQueue.filter(
          (e: any) => e.timestampSeconds !== event.timestampSeconds
        );
      }
      analysis.scoring = scoring;
    }

    analysis.humanReviewQueue = newReviewQueue;
    analysis.verifiedEvents = newVerifiedEvents;

    // Update the game
    await db
      .update(games)
      .set({
        geminiAnalysis: analysis,
        annotationStatus: newReviewQueue.length === 0 ? 'reviewed' : 'pending',
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    return NextResponse.json({
      success: true,
      source: 'geminiAnalysis',
      remainingReviewCount: newReviewQueue.length,
    });
  } catch (error) {
    console.error('Error processing review:', error);
    return NextResponse.json({ error: 'Failed to process review' }, { status: 500 });
  }
}
