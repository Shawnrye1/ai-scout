import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, corrections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { gameId, event } = await request.json() as {
      gameId: string;
      event: {
        type: 'scoring';
        team: 'home' | 'away';
        points: number;
        shotType: string;
        timestamp: string;
        timestampSeconds: number;
        jersey?: number;
        notes?: string;
      };
    };

    if (!gameId || !event) {
      return NextResponse.json({ error: 'Missing gameId or event' }, { status: 400 });
    }

    // Get the game
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const analysis = game.geminiAnalysis as any;
    if (!analysis) {
      return NextResponse.json({ error: 'No analysis found for game' }, { status: 400 });
    }

    // Add to verified events and update score
    const scoring = analysis.scoring || { home: 0, away: 0, verifiedEvents: [], reviewQueue: [] };

    const newEvent = {
      ...event,
      verified: true,
      verificationMethod: 'human_added',
      addedAt: new Date().toISOString(),
    };

    scoring.verifiedEvents = scoring.verifiedEvents || [];
    scoring.verifiedEvents.push(newEvent);

    // Update the score
    if (event.team === 'home') {
      scoring.home = (scoring.home || 0) + event.points;
    } else {
      scoring.away = (scoring.away || 0) + event.points;
    }

    analysis.scoring = scoring;

    // Also add to verifiedEvents list
    const verifiedEvents = analysis.verifiedEvents || [];
    verifiedEvents.push({
      type: 'scoring',
      timestamp: event.timestamp,
      timestampSeconds: event.timestampSeconds,
      team: event.team,
      jersey: event.jersey,
      points: event.points,
      shotType: event.shotType,
      verificationMethod: 'human_added',
      humanVerified: true,
    });
    analysis.verifiedEvents = verifiedEvents;

    // Save correction for training (AI missed this event)
    await db.insert(corrections).values({
      gameId: gameId,
      originalData: null, // AI didn't detect this
      correctedData: {
        action: 'add_missed',
        event: newEvent,
        humanAdded: true,
      },
      correctedBy: 'admin',
      correctionType: 'missed_event',
      notes: event.notes || `Human added missed ${event.points}pt ${event.shotType} for ${event.team} at ${event.timestamp}`,
    });

    // Update the game
    await db
      .update(games)
      .set({
        geminiAnalysis: analysis,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    return NextResponse.json({
      success: true,
      newScore: { home: scoring.home, away: scoring.away },
    });
  } catch (error) {
    console.error('Error adding missed event:', error);
    return NextResponse.json({ error: 'Failed to add event' }, { status: 500 });
  }
}
