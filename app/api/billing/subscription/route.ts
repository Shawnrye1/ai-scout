import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getUsageLimits, PLAN_LIMITS } from '@/lib/billing/limits';

// GET /api/billing/subscription - Get current user's subscription
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limits = await getUsageLimits(user.id);

    if (!limits) {
      return NextResponse.json({
        subscription: null,
      });
    }

    return NextResponse.json({
      subscription: {
        planName: limits.planName,
        status: 'active', // TODO: Get actual status from Stripe
        currentPeriodEnd: null, // Would come from Stripe
        gamesUsed: limits.gamesUsed,
        gamesLimit: limits.gamesLimit,
        canUpload: limits.canUpload,
        remainingGames: limits.remainingGames,
        maxVideoDurationMinutes: limits.maxVideoDurationMinutes,
      },
      plans: PLAN_LIMITS,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
