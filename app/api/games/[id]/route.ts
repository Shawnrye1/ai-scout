import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedTeams, detectedPlayers, detectedPlays, playerAnalysis, teamAnalysis, keyMoments } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/games/[id] - Get a single game with all analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const game = await db.query.games.findFirst({
      where: eq(games.id, id),
      with: {
        detectedTeams: {
          with: {
            players: {
              with: {
                analysis: true,
                keyMoments: true,
              }
            },
            analysis: true,
          }
        },
        detectedPlays: true,
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify user has access to this game
    const teamResult = await db.query.teamMembers.findFirst({
      where: (tm, { eq }) => eq(tm.userId, user.id),
    });

    // In development, allow access if user is authenticated
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && game.teamId !== teamResult?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}

const updateGameSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  opponent: z.string().optional(),
  gameDate: z.string().optional(),
  sport: z.enum(['football', 'basketball']).optional(),
  status: z.enum(['uploading', 'queued', 'detecting', 'tracking', 'analyzing', 'ready', 'failed']).optional(),
  videoUrl: z.string().optional(),
  videoKey: z.string().optional(),
  videoDurationSeconds: z.number().optional(),
  videoSizeBytes: z.number().optional(),
  processingProgress: z.number().min(0).max(100).optional(),
  processingError: z.string().optional(),
});

// PATCH /api/games/[id] - Update a game
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateGameSchema.parse(body);

    // Verify ownership
    const existingGame = await db.query.games.findFirst({
      where: eq(games.id, id),
    });

    if (!existingGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const teamResult = await db.query.teamMembers.findFirst({
      where: (tm, { eq }) => eq(tm.userId, user.id),
    });

    if (existingGame.teamId !== teamResult?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [updatedGame] = await db.update(games)
      .set({
        ...data,
        gameDate: data.gameDate ? new Date(data.gameDate) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(games.id, id))
      .returning();

    return NextResponse.json({ game: updatedGame });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating game:', error);
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}

// DELETE /api/games/[id] - Delete a game
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existingGame = await db.query.games.findFirst({
      where: eq(games.id, id),
    });

    if (!existingGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const teamResult = await db.query.teamMembers.findFirst({
      where: (tm, { eq }) => eq(tm.userId, user.id),
    });

    if (existingGame.teamId !== teamResult?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete game (cascades to related tables)
    await db.delete(games).where(eq(games.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting game:', error);
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
  }
}
