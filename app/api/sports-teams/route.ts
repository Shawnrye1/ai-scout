import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sportsTeams } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

// GET - List all sports teams (for opponent selection)
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const teams = await db
      .select({
        id: sportsTeams.id,
        name: sportsTeams.name,
        sport: sportsTeams.sport,
        city: sportsTeams.city,
        state: sportsTeams.state,
        jerseyColorHome: sportsTeams.jerseyColorHome,
        jerseyColorAway: sportsTeams.jerseyColorAway,
      })
      .from(sportsTeams)
      .orderBy(sportsTeams.name);

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching sports teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}
