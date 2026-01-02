/**
 * Scouting Few-Shot Learning System
 *
 * This module provides verified scouting observations to include in Player Deep Dive prompts,
 * improving accuracy through few-shot learning without model training.
 *
 * Unlike event-based few-shot learning (which was for stats), this focuses on
 * qualitative scouting observations:
 * - Preferred hand
 * - Primary moves
 * - Defensive rating
 * - How to guard/attack
 * - etc.
 */

import { db } from "@/lib/db/drizzle";
import {
  verifiedScouting,
  scoutingReviewQueue,
  detectedPlayers,
  games,
} from "@/lib/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";

// Observation types that we track for scouting
export const SCOUTING_OBSERVATION_TYPES = [
  "preferred_hand",
  "primary_moves",
  "shooting_ability",
  "defensive_rating",
  "basketball_iq",
  "motor",
  "physical_profile",
  "position",
  "how_to_guard",
  "how_to_attack",
  "overall_assessment",
] as const;

export type ScoutingObservationType =
  (typeof SCOUTING_OBSERVATION_TYPES)[number];

export interface VerifiedScoutingExample {
  team: string;
  jerseyNumber: number | null;
  observationType: ScoutingObservationType;
  originalValue: string;
  verifiedValue: string;
  wasCorrection: boolean;
  notes: string | null;
}

interface ScoutingFewShotConfig {
  enabled: boolean;
  maxExamplesPerType: number;
  prioritizeCorrections: boolean; // Corrections are more valuable than confirmations
}

const DEFAULT_CONFIG: ScoutingFewShotConfig = {
  enabled: true,
  maxExamplesPerType: 3,
  prioritizeCorrections: true,
};

/**
 * Get verified scouting examples for a specific observation type
 */
export async function getVerifiedScoutingExamples(
  observationType: ScoutingObservationType,
  limit: number = 3,
): Promise<VerifiedScoutingExample[]> {
  const examples = await db
    .select({
      team: verifiedScouting.team,
      jerseyNumber: verifiedScouting.jerseyNumber,
      observationType: verifiedScouting.observationType,
      originalValue: verifiedScouting.originalValue,
      verifiedValue: verifiedScouting.verifiedValue,
      wasCorrection: verifiedScouting.wasCorrection,
      notes: verifiedScouting.notes,
      quality: verifiedScouting.quality,
    })
    .from(verifiedScouting)
    .where(eq(verifiedScouting.observationType, observationType))
    .orderBy(
      // Prioritize: 1) exemplary quality, 2) corrections (more valuable), 3) most recent
      sql`CASE WHEN ${verifiedScouting.quality} = 'exemplary' THEN 0 ELSE 1 END`,
      sql`CASE WHEN ${verifiedScouting.wasCorrection} = true THEN 0 ELSE 1 END`,
      desc(verifiedScouting.createdAt),
    )
    .limit(limit);

  return examples.map((e) => ({
    team: e.team,
    jerseyNumber: e.jerseyNumber,
    observationType: e.observationType as ScoutingObservationType,
    originalValue: e.originalValue,
    verifiedValue: e.verifiedValue,
    wasCorrection: e.wasCorrection || false,
    notes: e.notes,
  }));
}

/**
 * Get all verified scouting examples grouped by observation type
 */
export async function getAllVerifiedScoutingExamples(
  config: ScoutingFewShotConfig = DEFAULT_CONFIG,
): Promise<Record<ScoutingObservationType, VerifiedScoutingExample[]>> {
  const result: Record<string, VerifiedScoutingExample[]> = {};

  for (const observationType of SCOUTING_OBSERVATION_TYPES) {
    result[observationType] = await getVerifiedScoutingExamples(
      observationType,
      config.maxExamplesPerType,
    );
  }

  return result as Record<ScoutingObservationType, VerifiedScoutingExample[]>;
}

/**
 * Format verified scouting examples for inclusion in a Gemini prompt
 */
export function formatScoutingExamplesForPrompt(
  examples: VerifiedScoutingExample[],
  observationType: string,
): string {
  if (examples.length === 0) {
    return "";
  }

  // Format with emphasis on corrections (where the AI was wrong)
  const formattedExamples = examples
    .map((ex, i) => {
      const jersey = ex.jerseyNumber ? `#${ex.jerseyNumber}` : "player";
      if (ex.wasCorrection) {
        return `  ${i + 1}. ${ex.team} team ${jersey}: AI said "${ex.originalValue}" → CORRECT: "${ex.verifiedValue}"${ex.notes ? ` (${ex.notes})` : ""}`;
      } else {
        return `  ${i + 1}. ${ex.team} team ${jersey}: "${ex.verifiedValue}" ✓ (confirmed accurate)`;
      }
    })
    .join("\n");

  const humanReadableType = observationType.replace(/_/g, " ").toUpperCase();

  return `
VERIFIED ${humanReadableType} OBSERVATIONS (learn from these):
${formattedExamples}
`;
}

/**
 * Build few-shot context for the Player Deep Dive agent
 */
export async function buildScoutingFewShotContext(
  config: ScoutingFewShotConfig = DEFAULT_CONFIG,
): Promise<string> {
  if (!config.enabled) {
    return "";
  }

  const allExamples = await getAllVerifiedScoutingExamples(config);
  const contextParts: string[] = [];

  // Group by type and format
  for (const observationType of SCOUTING_OBSERVATION_TYPES) {
    const examples = allExamples[observationType];
    if (examples && examples.length > 0) {
      contextParts.push(
        formatScoutingExamplesForPrompt(examples, observationType),
      );
    }
  }

  if (contextParts.length === 0) {
    return "";
  }

  return `
=== SCOUTING CALIBRATION (Human-Verified Examples) ===
The following observations have been verified by coaches. Use these to calibrate your scouting accuracy:
${contextParts.join("\n")}

IMPORTANT: When you see a pattern similar to a correction above, apply the lesson learned.
For example, if a correction shows "AI said 'drives right' → CORRECT: 'drives left'",
be extra careful to verify hand preference by watching multiple possessions.
============================================
`;
}

/**
 * Save a verified scouting observation
 */
export async function saveVerifiedScoutingObservation(
  gameId: string,
  observation: {
    detectedPlayerId?: string;
    team: "home" | "away";
    jerseyNumber?: number;
    observationType: ScoutingObservationType;
    originalValue: string;
    verifiedValue: string;
    wasCorrection: boolean;
    videoTimestamp?: string;
    videoTimestampSeconds?: number;
    notes?: string;
  },
  verifiedBy: string,
  quality: "standard" | "exemplary" = "standard",
): Promise<void> {
  await db.insert(verifiedScouting).values({
    gameId,
    detectedPlayerId: observation.detectedPlayerId || null,
    team: observation.team,
    jerseyNumber: observation.jerseyNumber || null,
    observationType: observation.observationType,
    originalValue: observation.originalValue,
    verifiedValue: observation.verifiedValue,
    wasCorrection: observation.wasCorrection,
    videoTimestamp: observation.videoTimestamp || null,
    videoTimestampSeconds: observation.videoTimestampSeconds || null,
    verifiedBy,
    quality,
    notes: observation.notes || null,
  });
}

/**
 * Get count of verified scouting examples by observation type
 */
export async function getVerifiedScoutingCounts(): Promise<
  Record<string, number>
> {
  const counts: Record<string, number> = {};

  for (const observationType of SCOUTING_OBSERVATION_TYPES) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(verifiedScouting)
      .where(eq(verifiedScouting.observationType, observationType));

    counts[observationType] = result[0]?.count || 0;
  }

  return counts;
}

/**
 * Get scouting few-shot learning statistics
 */
export async function getScoutingFewShotStats(): Promise<{
  totalExamples: number;
  totalCorrections: number;
  byObservationType: Record<string, { total: number; corrections: number }>;
  recentExamples: Array<{
    observationType: string;
    team: string;
    jerseyNumber: number | null;
    wasCorrection: boolean;
    createdAt: Date;
  }>;
}> {
  const allExamples = await db
    .select({
      observationType: verifiedScouting.observationType,
      team: verifiedScouting.team,
      jerseyNumber: verifiedScouting.jerseyNumber,
      wasCorrection: verifiedScouting.wasCorrection,
      createdAt: verifiedScouting.createdAt,
    })
    .from(verifiedScouting)
    .orderBy(desc(verifiedScouting.createdAt));

  const byObservationType: Record<
    string,
    { total: number; corrections: number }
  > = {};
  let totalCorrections = 0;

  for (const ex of allExamples) {
    if (!byObservationType[ex.observationType]) {
      byObservationType[ex.observationType] = { total: 0, corrections: 0 };
    }
    byObservationType[ex.observationType].total++;
    if (ex.wasCorrection) {
      byObservationType[ex.observationType].corrections++;
      totalCorrections++;
    }
  }

  return {
    totalExamples: allExamples.length,
    totalCorrections,
    byObservationType,
    recentExamples: allExamples.slice(0, 10).map((ex) => ({
      observationType: ex.observationType,
      team: ex.team,
      jerseyNumber: ex.jerseyNumber,
      wasCorrection: ex.wasCorrection || false,
      createdAt: ex.createdAt,
    })),
  };
}

/**
 * Add a player to the scouting review queue
 */
export async function addToScoutingReviewQueue(
  gameId: string,
  player: {
    detectedPlayerId?: string;
    team: "home" | "away";
    jerseyNumber?: number;
    playerName?: string;
    scoutingData: any; // The full scouting output from Gemini
  },
): Promise<void> {
  await db.insert(scoutingReviewQueue).values({
    gameId,
    detectedPlayerId: player.detectedPlayerId || null,
    team: player.team,
    jerseyNumber: player.jerseyNumber || null,
    playerName: player.playerName || null,
    scoutingData: player.scoutingData,
    status: "pending",
  });
}

/**
 * Get pending scouting reviews for a game
 */
export async function getPendingScoutingReviews(gameId?: string): Promise<
  Array<{
    id: string;
    gameId: string;
    gameName: string | null;
    team: string;
    jerseyNumber: number | null;
    playerName: string | null;
    scoutingData: any;
    createdAt: Date;
  }>
> {
  const query = db
    .select({
      id: scoutingReviewQueue.id,
      gameId: scoutingReviewQueue.gameId,
      gameName: games.title,
      team: scoutingReviewQueue.team,
      jerseyNumber: scoutingReviewQueue.jerseyNumber,
      playerName: scoutingReviewQueue.playerName,
      scoutingData: scoutingReviewQueue.scoutingData,
      createdAt: scoutingReviewQueue.createdAt,
    })
    .from(scoutingReviewQueue)
    .leftJoin(games, eq(scoutingReviewQueue.gameId, games.id))
    .where(
      gameId
        ? and(
            eq(scoutingReviewQueue.status, "pending"),
            eq(scoutingReviewQueue.gameId, gameId),
          )
        : eq(scoutingReviewQueue.status, "pending"),
    )
    .orderBy(scoutingReviewQueue.createdAt);

  return query;
}

/**
 * Mark a scouting review as completed
 */
export async function completeScoutingReview(
  reviewId: string,
  reviewedBy: string,
): Promise<void> {
  await db
    .update(scoutingReviewQueue)
    .set({
      status: "reviewed",
      reviewedAt: new Date(),
      reviewedBy,
    })
    .where(eq(scoutingReviewQueue.id, reviewId));
}
