/**
 * Few-Shot Learning System for Gemini Prompts
 *
 * This module provides verified examples to include in Gemini prompts,
 * improving accuracy through few-shot learning without model training.
 */

import { db } from '@/lib/db/drizzle';
import { verifiedExamples, corrections, promptVersions } from '@/lib/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

// Event type categories that map to agent types
export const EVENT_TYPES = {
  scoring: ['scoring', 'shot_made', 'shot_attempt', 'free_throw', 'basket'],
  rebound: ['rebound', 'offensive_rebound', 'defensive_rebound'],
  assist: ['assist'],
  steal: ['steal'],
  block: ['block'],
  turnover: ['turnover'],
} as const;

// Agent types that can use few-shot examples
export const AGENT_TYPES = [
  'offensive',
  'defensive',
  'jersey_scan',
  'game_flow',
  'coaching',
  'player_home',
  'player_away',
] as const;

export type AgentType = typeof AGENT_TYPES[number];
export type EventType = keyof typeof EVENT_TYPES;

interface FewShotExample {
  timestamp: string;
  team: string;
  jerseyNumber: number | null;
  description: string;
  eventType: string;
}

interface FewShotConfig {
  enabled: boolean;
  maxExamplesPerType: number;
  prioritizeExemplary: boolean;
}

// Default config - can be overridden via settings
const DEFAULT_CONFIG: FewShotConfig = {
  enabled: true,
  maxExamplesPerType: 5,
  prioritizeExemplary: true,
};

/**
 * Get verified examples for a specific event type
 */
export async function getVerifiedExamples(
  eventType: EventType,
  limit: number = 5
): Promise<FewShotExample[]> {
  const examples = await db
    .select({
      timestamp: verifiedExamples.timestamp,
      team: verifiedExamples.team,
      jerseyNumber: verifiedExamples.jerseyNumber,
      description: verifiedExamples.description,
      eventType: verifiedExamples.eventType,
      quality: verifiedExamples.quality,
    })
    .from(verifiedExamples)
    .where(eq(verifiedExamples.eventType, eventType))
    .orderBy(
      // Prioritize exemplary examples, then most recent
      sql`CASE WHEN ${verifiedExamples.quality} = 'exemplary' THEN 0 ELSE 1 END`,
      desc(verifiedExamples.createdAt)
    )
    .limit(limit);

  return examples;
}

/**
 * Get all verified examples grouped by event type
 */
export async function getAllVerifiedExamples(
  config: FewShotConfig = DEFAULT_CONFIG
): Promise<Record<EventType, FewShotExample[]>> {
  const result: Record<string, FewShotExample[]> = {};

  for (const eventType of Object.keys(EVENT_TYPES) as EventType[]) {
    result[eventType] = await getVerifiedExamples(eventType, config.maxExamplesPerType);
  }

  return result as Record<EventType, FewShotExample[]>;
}

/**
 * Format verified examples for inclusion in a Gemini prompt
 */
export function formatExamplesForPrompt(
  examples: FewShotExample[],
  eventType: string
): string {
  if (examples.length === 0) {
    return '';
  }

  const formattedExamples = examples
    .map((ex, i) => {
      const jersey = ex.jerseyNumber ? `#${ex.jerseyNumber}` : 'player';
      return `  ${i + 1}. At ${ex.timestamp}, ${ex.team} team ${jersey}: ${ex.description}`;
    })
    .join('\n');

  return `
VERIFIED EXAMPLES of ${eventType} events (use these as reference):
${formattedExamples}
`;
}

/**
 * Build few-shot context for an agent based on its type
 */
export async function buildFewShotContext(
  agentType: AgentType,
  config: FewShotConfig = DEFAULT_CONFIG
): Promise<string> {
  if (!config.enabled) {
    return '';
  }

  let relevantEventTypes: EventType[] = [];

  switch (agentType) {
    case 'offensive':
      relevantEventTypes = ['scoring', 'assist', 'turnover'];
      break;
    case 'defensive':
      relevantEventTypes = ['steal', 'block', 'rebound'];
      break;
    case 'game_flow':
      relevantEventTypes = ['scoring'];
      break;
    case 'player_home':
    case 'player_away':
      relevantEventTypes = ['scoring', 'rebound', 'assist', 'steal', 'block', 'turnover'];
      break;
    default:
      return '';
  }

  const contextParts: string[] = [];

  for (const eventType of relevantEventTypes) {
    const examples = await getVerifiedExamples(eventType, config.maxExamplesPerType);
    if (examples.length > 0) {
      contextParts.push(formatExamplesForPrompt(examples, eventType));
    }
  }

  if (contextParts.length === 0) {
    return '';
  }

  return `
=== FEW-SHOT LEARNING CONTEXT ===
The following are human-verified examples from previous games. Use these to calibrate your detection accuracy:
${contextParts.join('\n')}
=================================
`;
}

/**
 * Save a verified event as an example for future few-shot learning
 */
export async function saveVerifiedExample(
  gameId: string,
  event: {
    type: string;
    team: 'home' | 'away';
    jerseyNumber?: number;
    timestamp: string;
    timestampSeconds?: number;
    description: string;
    rawData?: any;
  },
  verifiedBy: string,
  quality: 'standard' | 'exemplary' = 'standard'
): Promise<void> {
  // Normalize event type
  let eventType = event.type.toLowerCase();
  for (const [category, aliases] of Object.entries(EVENT_TYPES)) {
    if ((aliases as readonly string[]).includes(eventType)) {
      eventType = category;
      break;
    }
  }

  await db.insert(verifiedExamples).values({
    gameId,
    eventType,
    team: event.team,
    jerseyNumber: event.jerseyNumber || null,
    timestamp: event.timestamp,
    timestampSeconds: event.timestampSeconds,
    description: event.description,
    rawEventData: event.rawData,
    verifiedBy,
    quality,
  });
}

/**
 * Get few-shot learning statistics
 */
export async function getFewShotStats(): Promise<{
  totalExamples: number;
  byEventType: Record<string, number>;
  exemplaryCount: number;
  recentExamples: Array<{ eventType: string; description: string; createdAt: Date }>;
}> {
  const allExamples = await db
    .select({
      eventType: verifiedExamples.eventType,
      quality: verifiedExamples.quality,
      description: verifiedExamples.description,
      createdAt: verifiedExamples.createdAt,
    })
    .from(verifiedExamples)
    .orderBy(desc(verifiedExamples.createdAt));

  const byEventType: Record<string, number> = {};
  let exemplaryCount = 0;

  for (const ex of allExamples) {
    byEventType[ex.eventType] = (byEventType[ex.eventType] || 0) + 1;
    if (ex.quality === 'exemplary') {
      exemplaryCount++;
    }
  }

  return {
    totalExamples: allExamples.length,
    byEventType,
    exemplaryCount,
    recentExamples: allExamples.slice(0, 10).map(ex => ({
      eventType: ex.eventType,
      description: ex.description,
      createdAt: ex.createdAt,
    })),
  };
}

// ============================================
// PROMPT VERSIONING
// ============================================

/**
 * Calculate hash of a prompt for versioning
 */
export function calculatePromptHash(promptContent: string): string {
  return crypto.createHash('sha256').update(promptContent).digest('hex').slice(0, 16);
}

/**
 * Get the current active prompt version for an agent
 */
export async function getActivePromptVersion(agentType: AgentType) {
  const [version] = await db
    .select()
    .from(promptVersions)
    .where(and(
      eq(promptVersions.agentType, agentType),
      eq(promptVersions.isActive, true)
    ))
    .limit(1);

  return version;
}

/**
 * Record a new prompt version
 */
export async function recordPromptVersion(
  agentType: AgentType,
  promptContent: string,
  summary: string,
  changeReason: string,
  fewShotEnabled: boolean = false,
  fewShotCount: number = 0
): Promise<string> {
  const hash = calculatePromptHash(promptContent);

  // Check if this exact prompt already exists
  const [existing] = await db
    .select()
    .from(promptVersions)
    .where(and(
      eq(promptVersions.agentType, agentType),
      eq(promptVersions.promptHash, hash)
    ))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  // Get next version number
  const [latestVersion] = await db
    .select({ version: promptVersions.version })
    .from(promptVersions)
    .where(eq(promptVersions.agentType, agentType))
    .orderBy(desc(promptVersions.createdAt))
    .limit(1);

  let nextVersion = 'v1.0.0';
  if (latestVersion) {
    const parts = latestVersion.version.replace('v', '').split('.');
    const minor = parseInt(parts[1] || '0') + 1;
    nextVersion = `v${parts[0]}.${minor}.0`;
  }

  // Deactivate current active version
  await db
    .update(promptVersions)
    .set({ isActive: false, deactivatedAt: new Date() })
    .where(and(
      eq(promptVersions.agentType, agentType),
      eq(promptVersions.isActive, true)
    ));

  // Insert new version
  const [newVersion] = await db
    .insert(promptVersions)
    .values({
      agentType,
      version: nextVersion,
      promptHash: hash,
      promptSummary: summary,
      changeReason,
      fewShotEnabled,
      fewShotCount,
      isActive: true,
      activatedAt: new Date(),
    })
    .returning({ id: promptVersions.id });

  return newVersion.id;
}

/**
 * Update accuracy metrics for a prompt version
 */
export async function updatePromptVersionMetrics(
  versionId: string,
  metrics: {
    gamesAnalyzed?: number;
    eventsDetected?: number;
    eventsVerified?: number;
    eventsRejected?: number;
  }
): Promise<void> {
  const [current] = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.id, versionId))
    .limit(1);

  if (!current) return;

  const newGames = (current.gamesAnalyzed || 0) + (metrics.gamesAnalyzed || 0);
  const newDetected = (current.eventsDetected || 0) + (metrics.eventsDetected || 0);
  const newVerified = (current.eventsVerified || 0) + (metrics.eventsVerified || 0);
  const newRejected = (current.eventsRejected || 0) + (metrics.eventsRejected || 0);
  const total = newVerified + newRejected;
  const accuracyRate = total > 0 ? (newVerified / total) * 100 : null;

  await db
    .update(promptVersions)
    .set({
      gamesAnalyzed: newGames,
      eventsDetected: newDetected,
      eventsVerified: newVerified,
      eventsRejected: newRejected,
      accuracyRate: accuracyRate?.toString(),
    })
    .where(eq(promptVersions.id, versionId));
}

/**
 * Get prompt version history for an agent
 */
export async function getPromptVersionHistory(agentType: AgentType) {
  return db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.agentType, agentType))
    .orderBy(desc(promptVersions.createdAt));
}
