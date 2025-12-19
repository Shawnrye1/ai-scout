import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teams, teamMembers, games } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, sql, and, isNotNull } from 'drizzle-orm';

// GET /api/admin/billing/subscriptions - Get all team subscriptions (admin only)
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all teams with subscription data
    const teamsData = await db.query.teams.findMany({
      where: isNotNull(teams.planName),
      with: {
        teamMembers: true,
      },
    });

    // Get games count per team for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const gamesCountResult = await db
      .select({
        teamId: games.teamId,
        count: sql<number>`count(*)`,
      })
      .from(games)
      .where(sql`${games.createdAt} >= ${startOfMonth}`)
      .groupBy(games.teamId);

    const gamesCountMap = new Map(
      gamesCountResult.map((g) => [g.teamId, Number(g.count)])
    );

    // Get pricing and limits
    const planConfig: Record<string, { price: number; limit: number }> = {
      'Starter': { price: 49, limit: 10 },
      'Pro': { price: 149, limit: 50 },
      'Team': { price: 299, limit: -1 },
    };

    const subscriptions = teamsData.map((team) => {
      const config = planConfig[team.planName || ''] || { price: 0, limit: 5 };
      return {
        id: team.id,
        teamName: team.name,
        planName: team.planName || 'Free',
        status: team.subscriptionStatus || 'inactive',
        amount: config.price,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Placeholder
        gamesUsed: gamesCountMap.get(team.id) || 0,
        gamesLimit: config.limit,
        memberCount: team.teamMembers?.length || 0,
      };
    });

    return NextResponse.json({
      subscriptions,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}
