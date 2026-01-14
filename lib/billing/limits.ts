import { db } from '@/lib/db/drizzle';
import { teams, teamMembers, games } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// Plan limits based on new pricing ($99/249/499)
export const PLAN_LIMITS = {
  'Free': { gamesPerMonth: 1, maxVideoDurationMinutes: 180, isLifetime: true },  // Free trial: 1 game TOTAL (not per month)
  'Starter': { gamesPerMonth: 5, maxVideoDurationMinutes: 180, isLifetime: false },   // $99/mo: 5 games/month
  'Pro': { gamesPerMonth: 10, maxVideoDurationMinutes: 180, isLifetime: false },      // $249/mo: 10 games/month
  'Team': { gamesPerMonth: 20, maxVideoDurationMinutes: 180, isLifetime: false },     // $499/mo: 20 games/month
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export interface UsageLimits {
  planName: PlanName;
  gamesUsed: number;
  gamesLimit: number;
  canUpload: boolean;
  remainingGames: number;
  maxVideoDurationMinutes: number;
}

/**
 * Get current usage and limits for a user's team
 */
export async function getUsageLimits(userId: number): Promise<UsageLimits | null> {
  // Get user's team
  const teamMember = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, userId),
    with: { team: true },
  });

  if (!teamMember?.team) {
    return null;
  }

  const team = teamMember.team;

  // Get plan limits (default to Free if no plan)
  const planName = (team.planName as PlanName) || 'Free';
  const limits = PLAN_LIMITS[planName] || PLAN_LIMITS.Free;

  // For Free tier: count ALL games ever (lifetime limit)
  // For paid tiers: count games this month only
  let gamesUsed: number;

  if (limits.isLifetime) {
    // Count all games for this team (lifetime)
    const allGames = await db
      .select({ count: sql<number>`count(*)` })
      .from(games)
      .where(eq(games.teamId, team.id));
    gamesUsed = Number(allGames[0]?.count || 0);
  } else {
    // Count games this month only
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
    gamesUsed = Number(gamesThisMonth[0]?.count || 0);
  }

  const canUpload = gamesUsed < limits.gamesPerMonth;
  const remainingGames = Math.max(0, limits.gamesPerMonth - gamesUsed);

  return {
    planName,
    gamesUsed,
    gamesLimit: limits.gamesPerMonth,
    canUpload,
    remainingGames,
    maxVideoDurationMinutes: limits.maxVideoDurationMinutes,
  };
}

/**
 * Check if user can upload a new game (throws if not)
 */
export async function assertCanUpload(userId: number): Promise<UsageLimits> {
  const limits = await getUsageLimits(userId);

  if (!limits) {
    throw new UploadLimitError('No team found. Please create or join a team first.');
  }

  if (!limits.canUpload) {
    throw new UploadLimitError(
      limits.planName === 'Free'
        ? `You've used your free trial game. Upgrade to upload more games.`
        : `Monthly game limit reached (${limits.gamesUsed}/${limits.gamesLimit}). Upgrade your plan for more games.`
    );
  }

  return limits;
}

export class UploadLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadLimitError';
  }
}
