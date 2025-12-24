import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sportsTeams, sportsTeamPlayers, teams, teamMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

// Get the user's team and its linked sports team
async function getTeamWithSportsTeam() {
  const user = await getUser();
  if (!user) return null;

  const result = await db
    .select({
      team: teams,
      sportsTeam: sportsTeams,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .leftJoin(sportsTeams, eq(teams.sportsTeamId, sportsTeams.id))
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  return result[0] || null;
}

// GET - Get roster for the coach's team
export async function GET() {
  try {
    const data = await getTeamWithSportsTeam();
    if (!data) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // If no sports team linked, return empty roster
    if (!data.sportsTeam) {
      return NextResponse.json({
        sportsTeam: null,
        players: [],
        message: 'No sports team linked. Create or link a team first.',
      });
    }

    // Get all players for this sports team
    const players = await db
      .select()
      .from(sportsTeamPlayers)
      .where(eq(sportsTeamPlayers.sportsTeamId, data.sportsTeam.id))
      .orderBy(sportsTeamPlayers.jerseyNumber);

    return NextResponse.json({
      sportsTeam: data.sportsTeam,
      players,
    });
  } catch (error) {
    console.error('Error fetching roster:', error);
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
  }
}

// POST - Add a player to roster OR create/link sports team
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    // If creating a new sports team
    if (body.action === 'createTeam') {
      const { name, sport, city, state, jerseyColorHome, jerseyColorAway, conference, division } = body;

      // Create the sports team
      const [newSportsTeam] = await db
        .insert(sportsTeams)
        .values({
          name,
          sport: sport || 'basketball',
          city,
          state,
          jerseyColorHome,
          jerseyColorAway,
          conference,
          division,
        })
        .returning();

      // Link to the user's team
      const teamMember = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, user.id))
        .limit(1);

      if (teamMember[0]) {
        await db
          .update(teams)
          .set({ sportsTeamId: newSportsTeam.id, updatedAt: new Date() })
          .where(eq(teams.id, teamMember[0].teamId));
      }

      return NextResponse.json({ sportsTeam: newSportsTeam });
    }

    // Adding a player
    const { jerseyNumber, name, height, weight, position, yearGrade } = body;

    if (!jerseyNumber) {
      return NextResponse.json({ error: 'Jersey number is required' }, { status: 400 });
    }

    const data = await getTeamWithSportsTeam();
    if (!data?.sportsTeam) {
      return NextResponse.json({ error: 'No sports team linked' }, { status: 400 });
    }

    // Check for duplicate jersey number
    const existing = await db
      .select()
      .from(sportsTeamPlayers)
      .where(
        and(
          eq(sportsTeamPlayers.sportsTeamId, data.sportsTeam.id),
          eq(sportsTeamPlayers.jerseyNumber, jerseyNumber)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Jersey #${jerseyNumber} already exists on this roster` },
        { status: 400 }
      );
    }

    const [player] = await db
      .insert(sportsTeamPlayers)
      .values({
        sportsTeamId: data.sportsTeam.id,
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
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { id, jerseyNumber, name, height, weight, position, yearGrade } = body;

    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const data = await getTeamWithSportsTeam();
    if (!data?.sportsTeam) {
      return NextResponse.json({ error: 'No sports team linked' }, { status: 400 });
    }

    // Verify player belongs to this team
    const existing = await db
      .select()
      .from(sportsTeamPlayers)
      .where(
        and(
          eq(sportsTeamPlayers.id, id),
          eq(sportsTeamPlayers.sportsTeamId, data.sportsTeam.id)
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
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const data = await getTeamWithSportsTeam();
    if (!data?.sportsTeam) {
      return NextResponse.json({ error: 'No sports team linked' }, { status: 400 });
    }

    // Verify player belongs to this team
    const existing = await db
      .select()
      .from(sportsTeamPlayers)
      .where(
        and(
          eq(sportsTeamPlayers.id, parseInt(id)),
          eq(sportsTeamPlayers.sportsTeamId, data.sportsTeam.id)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    await db.delete(sportsTeamPlayers).where(eq(sportsTeamPlayers.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
  }
}
