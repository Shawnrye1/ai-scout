import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sportsTeams, sportsTeamPlayers } from '@/lib/db/schema';
import { eq, ilike, or, sql, desc } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

// GET - List all sports teams in the database
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sport = searchParams.get('sport') || '';

    let query = db
      .select({
        id: sportsTeams.id,
        name: sportsTeams.name,
        sport: sportsTeams.sport,
        city: sportsTeams.city,
        state: sportsTeams.state,
        conference: sportsTeams.conference,
        division: sportsTeams.division,
        jerseyColorHome: sportsTeams.jerseyColorHome,
        jerseyColorAway: sportsTeams.jerseyColorAway,
        createdAt: sportsTeams.createdAt,
        playerCount: sql<number>`(
          SELECT COUNT(*) FROM sports_team_players
          WHERE sports_team_players.sports_team_id = sports_teams.id
        )`.as('player_count'),
      })
      .from(sportsTeams)
      .$dynamic();

    // Add search filter
    if (search) {
      query = query.where(
        or(
          ilike(sportsTeams.name, `%${search}%`),
          ilike(sportsTeams.city, `%${search}%`),
          ilike(sportsTeams.state, `%${search}%`),
          ilike(sportsTeams.conference, `%${search}%`)
        )
      );
    }

    // Add sport filter
    if (sport) {
      query = query.where(eq(sportsTeams.sport, sport));
    }

    const teams = await query.orderBy(desc(sportsTeams.createdAt));

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST - Create a new sports team
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, sport, city, state, jerseyColorHome, jerseyColorAway, conference, division } = body;

    if (!name || !sport) {
      return NextResponse.json({ error: 'Name and sport are required' }, { status: 400 });
    }

    const [team] = await db
      .insert(sportsTeams)
      .values({
        name,
        sport,
        city,
        state,
        jerseyColorHome,
        jerseyColorAway,
        conference,
        division,
      })
      .returning();

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}

// PUT - Update a sports team
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, sport, city, state, jerseyColorHome, jerseyColorAway, conference, division } = body;

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const [team] = await db
      .update(sportsTeams)
      .set({
        name,
        sport,
        city,
        state,
        jerseyColorHome,
        jerseyColorAway,
        conference,
        division,
        updatedAt: new Date(),
      })
      .where(eq(sportsTeams.id, id))
      .returning();

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

// DELETE - Delete a sports team
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Delete all players first (cascade)
    await db.delete(sportsTeamPlayers).where(eq(sportsTeamPlayers.sportsTeamId, parseInt(id)));

    // Then delete the team
    await db.delete(sportsTeams).where(eq(sportsTeams.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
