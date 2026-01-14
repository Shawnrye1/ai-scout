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
  opponentSportsTeamId: z.number().optional(),
  isHomeGame: z.boolean().optional(),
  gameDate: z.string().optional(),
  sport: z.enum(['football', 'basketball']).optional(),
  // Box score text for player name mapping and stat validation
  boxScore: z.string().optional(),
  // For URL-based video uploads
  videoUrl: z.string().url().optional(),
  videoSource: z.enum(['hudl', 'youtube', 'vimeo', 'direct']).optional(),
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

    // If video URL is provided, set status to 'queued' for URL-based uploads
    const isUrlUpload = !!data.videoUrl;

    const [game] = await db.insert(games).values({
      teamId: teamResult.teamId,
      userId: user.id,
      title: data.title,
      opponent: data.opponent,
      opponentSportsTeamId: data.opponentSportsTeamId,
      isHomeGame: data.isHomeGame,
      gameDate: data.gameDate ? new Date(data.gameDate) : null,
      sport: data.sport,
      boxScore: data.boxScore,
      videoUrl: data.videoUrl,
      videoSource: data.videoSource,
      status: isUrlUpload ? 'queued' : 'uploading',
    }).returning();

    return NextResponse.json({ game });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating game:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
