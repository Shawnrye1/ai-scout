import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sportsTeamPlayers, sportsTeams } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

// GET - Get all players for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { teamId } = await params;
    const teamIdNum = parseInt(teamId);

    // Get team info
    const [team] = await db
      .select()
      .from(sportsTeams)
      .where(eq(sportsTeams.id, teamIdNum))
      .limit(1);

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get players
    const players = await db
      .select()
      .from(sportsTeamPlayers)
      .where(eq(sportsTeamPlayers.sportsTeamId, teamIdNum))
      .orderBy(sportsTeamPlayers.jerseyNumber);

    return NextResponse.json({ team, players });
  } catch (error) {
    console.error('Error fetching team players:', error);
    return NextResponse.json({ error: 'Failed to fetch team players' }, { status: 500 });
  }
}

// POST - Add a player to the team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { teamId } = await params;
    const teamIdNum = parseInt(teamId);
    const body = await request.json();
    const { jerseyNumber, name, height, weight, position, yearGrade } = body;

    if (!jerseyNumber) {
      return NextResponse.json({ error: 'Jersey number is required' }, { status: 400 });
    }

    // Check for duplicate jersey number
    const existing = await db
      .select()
      .from(sportsTeamPlayers)
      .where(
        and(
          eq(sportsTeamPlayers.sportsTeamId, teamIdNum),
          eq(sportsTeamPlayers.jerseyNumber, jerseyNumber)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Jersey #${jerseyNumber} already exists on this team` },
        { status: 400 }
      );
    }

    const [player] = await db
      .insert(sportsTeamPlayers)
      .values({
        sportsTeamId: teamIdNum,
        jerseyNumber,
        name,
        height,
        weight: weight ? parseInt(weight) : null,
        position,
        yearGrade,
      })
      .returning();

    return NextResponse.json({ player });
  } catch (error) {
    console.error('Error adding player:', error);
    return NextResponse.json({ error: 'Failed to add player' }, { status: 500 });
  }
}

// PUT - Update a player
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { teamId } = await params;
    const teamIdNum = parseInt(teamId);
    const body = await request.json();
    const { id, jerseyNumber, name, height, weight, position, yearGrade } = body;

    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Verify player belongs to this team
    const existing = await db
      .select()
      .from(sportsTeamPlayers)
      .where(
        and(
          eq(sportsTeamPlayers.id, id),
          eq(sportsTeamPlayers.sportsTeamId, teamIdNum)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const [player] = await db
      .update(sportsTeamPlayers)
      .set({
        jerseyNumber,
        name,
        height,
        weight: weight ? parseInt(weight) : null,
        position,
        yearGrade,
        updatedAt: new Date(),
      })
      .where(eq(sportsTeamPlayers.id, id))
      .returning();

    return NextResponse.json({ player });
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
  }
}

// DELETE - Remove a player
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { teamId } = await params;
    const teamIdNum = parseInt(teamId);

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Verify player belongs to this team
    const existing = await db
      .select()
      .from(sportsTeamPlayers)
      .where(
        and(
          eq(sportsTeamPlayers.id, parseInt(playerId)),
          eq(sportsTeamPlayers.sportsTeamId, teamIdNum)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    await db.delete(sportsTeamPlayers).where(eq(sportsTeamPlayers.id, parseInt(playerId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
  }
}
