import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teams, teamMembers, games } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and, sql } from 'drizzle-orm';

// GET /api/billing/subscription - Get current user's subscription
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's team
    const teamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
      with: { team: true },
    });

    if (!teamMember?.team) {
      return NextResponse.json({
        subscription: null,
      });
    }

    const team = teamMember.team;

    // Get games count this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const gamesThisMonth = await db
      .select({ count: sql<number>`count(*)` })
      .from(games)
      .where(
        and(
          eq(games.teamId, team.id),
          sql`${games.createdAt} >= ${startOfMonth}`
        )
      );

    // Determine games limit based on plan
    const gamesLimit =
      team.planName === 'Team' ? -1 :
      team.planName === 'Pro' ? 50 :
      team.planName === 'Starter' ? 10 :
      5; // Free tier

    return NextResponse.json({
      subscription: {
        planName: team.planName || 'Free',
        status: team.subscriptionStatus,
        currentPeriodEnd: null, // Would come from Stripe
        gamesUsed: Number(gamesThisMonth[0]?.count || 0),
        gamesLimit,
        stripeCustomerId: team.stripeCustomerId,
        stripeSubscriptionId: team.stripeSubscriptionId,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
