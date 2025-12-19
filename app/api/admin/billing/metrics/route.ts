import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teams } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, sql, and, isNotNull } from 'drizzle-orm';

// GET /api/admin/billing/metrics - Get revenue metrics (admin only)
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

    // Get active subscriptions count
    const activeSubsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(teams)
      .where(eq(teams.subscriptionStatus, 'active'));

    const activeSubscriptions = Number(activeSubsResult[0]?.count || 0);

    // Calculate MRR based on subscriptions
    const subscriptionPricing: Record<string, number> = {
      'Starter': 49,
      'Pro': 149,
      'Team': 299,
    };

    const plansResult = await db
      .select({
        planName: teams.planName,
        count: sql<number>`count(*)`,
      })
      .from(teams)
      .where(
        and(
          eq(teams.subscriptionStatus, 'active'),
          isNotNull(teams.planName)
        )
      )
      .groupBy(teams.planName);

    let mrr = 0;
    for (const plan of plansResult) {
      if (plan.planName && subscriptionPricing[plan.planName]) {
        mrr += subscriptionPricing[plan.planName] * Number(plan.count);
      }
    }

    // Calculate ARR
    const arr = mrr * 12;

    // Estimate churn rate (placeholder - would need historical data)
    const churnRate = 2.5;

    // MRR change (placeholder - would need previous month data)
    const mrrChange = 12.5;

    // Total revenue (placeholder - would come from Stripe)
    const totalRevenue = mrr * 6; // Rough estimate

    return NextResponse.json({
      metrics: {
        mrr,
        mrrChange,
        arr,
        totalRevenue,
        activeSubscriptions,
        churnRate,
      },
    });
  } catch (error) {
    console.error('Error fetching billing metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
