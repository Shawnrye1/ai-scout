import { db } from '@/lib/db/drizzle';
import { teams, teamMembers, games } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// Plan limits based on new pricing ($99/249/499)
export const PLAN_LIMITS = {
  'Free': { gamesPerMonth: 1, maxVideoDurationMinutes: 180 },      // Free trial: 1 game
  'Starter': { gamesPerMonth: 5, maxVideoDurationMinutes: 180 },   // $99/mo: 5 games
  'Pro': { gamesPerMonth: 10, maxVideoDurationMinutes: 180 },      // $249/mo: 10 games
  'Team': { gamesPerMonth: 20, maxVideoDurationMinutes: 180 },     // $499/mo: 20 games
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

  const gamesUsed = Number(gamesThisMonth[0]?.count || 0);

  // Get plan limits (default to Free if no plan)
  const planName = (team.planName as PlanName) || 'Free';
  const limits = PLAN_LIMITS[planName] || PLAN_LIMITS.Free;

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
      `Monthly game limit reached (${limits.gamesUsed}/${limits.gamesLimit}). ` +
      `Upgrade your plan for more games.`
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
