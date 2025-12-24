import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sportsTeams, sportsTeamPlayers } from '@/lib/db/schema';
import { eq, ilike, or, desc, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

// GET - List all players in the shared database
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sport = searchParams.get('sport') || '';
    const teamId = searchParams.get('teamId') || '';
    const position = searchParams.get('position') || '';

    let query = db
      .select({
        id: sportsTeamPlayers.id,
        jerseyNumber: sportsTeamPlayers.jerseyNumber,
        name: sportsTeamPlayers.name,
        height: sportsTeamPlayers.height,
        weight: sportsTeamPlayers.weight,
        position: sportsTeamPlayers.position,
        yearGrade: sportsTeamPlayers.yearGrade,
        sportsTeamId: sportsTeamPlayers.sportsTeamId,
        createdAt: sportsTeamPlayers.createdAt,
        teamName: sportsTeams.name,
        teamSport: sportsTeams.sport,
        teamCity: sportsTeams.city,
        teamState: sportsTeams.state,
      })
      .from(sportsTeamPlayers)
      .innerJoin(sportsTeams, eq(sportsTeamPlayers.sportsTeamId, sportsTeams.id))
      .$dynamic();

    // Add search filter
    if (search) {
      query = query.where(
        or(
          ilike(sportsTeamPlayers.name, `%${search}%`),
          ilike(sportsTeams.name, `%${search}%`),
          sql`${sportsTeamPlayers.jerseyNumber}::text ILIKE ${`%${search}%`}`
        )
      );
    }

    // Add sport filter
    if (sport) {
      query = query.where(eq(sportsTeams.sport, sport));
    }

    // Add team filter
    if (teamId) {
      query = query.where(eq(sportsTeamPlayers.sportsTeamId, parseInt(teamId)));
    }

    // Add position filter
    if (position) {
      query = query.where(eq(sportsTeamPlayers.position, position));
    }

    const players = await query.orderBy(desc(sportsTeamPlayers.createdAt));

    // Get unique positions for filter dropdown
    const positions = await db
      .selectDistinct({ position: sportsTeamPlayers.position })
      .from(sportsTeamPlayers)
      .where(sql`${sportsTeamPlayers.position} IS NOT NULL`);

    // Get teams for filter dropdown
    const teams = await db
      .select({
        id: sportsTeams.id,
        name: sportsTeams.name,
        sport: sportsTeams.sport,
      })
      .from(sportsTeams)
      .orderBy(sportsTeams.name);

    return NextResponse.json({
      players,
      positions: positions.map((p) => p.position).filter(Boolean),
      teams,
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

// PUT - Update a player
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, jerseyNumber, name, height, weight, position, yearGrade, sportsTeamId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
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
        sportsTeamId,
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

// DELETE - Delete a player
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    await db.delete(sportsTeamPlayers).where(eq(sportsTeamPlayers.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
  }
}
