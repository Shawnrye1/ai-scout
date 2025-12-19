import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import {
  detectedPlays,
  games,
  detectedPlayers,
  detectedTeams,
  corrections
} from '@/lib/db/schema';
import { eq, and, lt, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const filter = request.nextUrl.searchParams.get('filter') || 'all';

  try {
    let whereClause;

    switch (filter) {
      case 'low_confidence':
        whereClause = sql`CAST(${detectedPlays.confidence} AS DECIMAL) < 0.70`;
        break;
      case 'flagged':
        whereClause = eq(detectedPlays.needsReview, true);
        break;
      default:
        // All items that need review OR have low confidence
        whereClause = sql`${detectedPlays.needsReview} = true OR CAST(${detectedPlays.confidence} AS DECIMAL) < 0.70`;
    }

    const plays = await db
      .select({
        id: detectedPlays.id,
        gameId: detectedPlays.gameId,
        playType: detectedPlays.playType,
        startTimestamp: detectedPlays.startTimestamp,
        endTimestamp: detectedPlays.endTimestamp,
        confidence: detectedPlays.confidence,
        needsReview: detectedPlays.needsReview,
        createdAt: detectedPlays.createdAt,
        gameName: games.name,
        gameTitle: games.title,
      })
      .from(detectedPlays)
      .leftJoin(games, eq(games.id, detectedPlays.gameId))
      .where(whereClause)
      .orderBy(desc(detectedPlays.createdAt))
      .limit(50);

    // For each play, get associated players
    const items = await Promise.all(
      plays.map(async (play) => {
        const players = await db
          .select({
            id: detectedPlayers.id,
            jerseyNumber: detectedPlayers.jerseyNumber,
            teamName: detectedTeams.teamName,
          })
          .from(detectedPlayers)
          .leftJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
          .where(eq(detectedPlayers.gameId, play.gameId))
          .limit(10);

        return {
          id: play.id,
          gameId: play.gameId,
          gameName: play.gameName || play.gameTitle || 'Untitled Game',
          playType: play.playType || 'Unknown',
          timestamp: parseFloat(play.startTimestamp?.toString() || '0'),
          duration: parseFloat(play.endTimestamp?.toString() || '0') - parseFloat(play.startTimestamp?.toString() || '0'),
          confidence: Math.round(parseFloat(play.confidence?.toString() || '50')),
          flagReason: play.needsReview ? 'Coach flagged' : 'Low confidence',
          flaggedBy: 'System',
          flaggedAt: play.createdAt
            ? new Date(play.createdAt).toLocaleString()
            : 'Unknown',
          players: players.map((p) => ({
            id: p.id,
            jerseyNumber: p.jerseyNumber || '??',
            team: p.teamName || 'Unknown Team',
          })),
        };
      })
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to fetch corrections:', error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playId, corrections: correctionData } = body;

    if (!playId) {
      return NextResponse.json(
        { error: 'Play ID is required' },
        { status: 400 }
      );
    }

    // Get the play
    const [play] = await db
      .select()
      .from(detectedPlays)
      .where(eq(detectedPlays.id, playId));

    if (!play) {
      return NextResponse.json(
        { error: 'Play not found' },
        { status: 404 }
      );
    }

    // Store the correction for training data
    await db.insert(corrections).values({
      playId,
      gameId: play.gameId,
      originalData: {
        playType: play.playType,
        confidence: play.confidence,
      },
      correctedData: correctionData,
      correctedBy: 'admin', // TODO: Get actual user
    });

    // Update the play with corrections
    const updates: any = {
      needsReview: false,
    };

    if (correctionData.playType) {
      updates.playType = correctionData.playType;
      updates.confidence = '1.00'; // Human-verified
    }

    await db
      .update(detectedPlays)
      .set(updates)
      .where(eq(detectedPlays.id, playId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save correction:', error);
    return NextResponse.json(
      { error: 'Failed to save correction' },
      { status: 500 }
    );
  }
}
