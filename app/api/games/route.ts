import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/games - List all games for the current user's team
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get team ID from user
    const teamResult = await db.query.teamMembers.findFirst({
      where: (tm, { eq }) => eq(tm.userId, user.id),
      with: { team: true }
    });

    if (!teamResult?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    const userGames = await db.query.games.findMany({
      where: eq(games.teamId, teamResult.teamId),
      orderBy: [desc(games.createdAt)],
      with: {
        detectedTeams: true,
        detectedPlayers: true,
      }
    });

    return NextResponse.json({ games: userGames });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

const createGameSchema = z.object({
  title: z.string().min(1).max(255),
  opponent: z.string().optional(),
  gameDate: z.string().optional(),
  sport: z.enum(['football', 'basketball']).optional(),
});

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createGameSchema.parse(body);

    // Get team ID
    const teamResult = await db.query.teamMembers.findFirst({
      where: (tm, { eq }) => eq(tm.userId, user.id),
    });

    if (!teamResult?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    const [game] = await db.insert(games).values({
      teamId: teamResult.teamId,
      userId: user.id,
      title: data.title,
      opponent: data.opponent,
      gameDate: data.gameDate ? new Date(data.gameDate) : null,
      sport: data.sport,
      status: 'uploading',
    }).returning();

    return NextResponse.json({ game });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating game:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
