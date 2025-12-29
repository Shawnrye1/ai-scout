/**
 * Prompt Suggestions Generator
 *
 * Analyzes rejection patterns from corrections to generate
 * actionable suggestions for improving Gemini prompts.
 */

import { db } from '@/lib/db/drizzle';
import { corrections, promptSuggestions } from '@/lib/db/schema';
import { desc, sql, eq, gte } from 'drizzle-orm';

interface RejectionPattern {
  reason: string;
  count: number;
  eventTypes: Record<string, number>;
  examples: string[];
}

interface PromptSuggestionResult {
  agentType: string;
  suggestionType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestedChange?: string;
  basedOnRejections: number;
  rejectionReasons: Record<string, number>;
}

// Map rejection reasons to suggestion types
const REJECTION_TO_SUGGESTION: Record<string, {
  type: string;
  generator: (pattern: RejectionPattern) => Partial<PromptSuggestionResult>;
}> = {
  not_real: {
    type: 'raise_threshold',
    generator: (p) => ({
      title: 'Too many false positives detected',
      description: `${p.count} events were marked as "not real". The model is detecting events that didn't actually happen.`,
      suggestedChange: `Add to prompt: "Only report events you are CERTAIN occurred. If unsure, do not include the event. False positives are worse than missing events."`,
    }),
  },
  wrong_type: {
    type: 'clarify_definition',
    generator: (p) => {
      const topTypes = Object.entries(p.eventTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type);
      return {
        title: `Event type confusion: ${topTypes.join(', ')}`,
        description: `${p.count} events were misclassified. Common confusion between: ${topTypes.join(', ')}.`,
        suggestedChange: `Add clearer definitions:
- SCORING: Only when ball goes through the hoop (made basket)
- REBOUND: Ball controlled after missed shot
- ASSIST: Pass directly leads to made basket
- STEAL: Takeaway from opponent in possession
- BLOCK: Deflection of shot attempt
- TURNOVER: Loss of possession without shot attempt`,
      };
    },
  },
  wrong_team: {
    type: 'add_constraint',
    generator: (p) => ({
      title: 'Team assignment errors',
      description: `${p.count} events were assigned to the wrong team. The model is confusing home/away teams.`,
      suggestedChange: `Add to prompt: "Pay close attention to jersey colors when assigning teams. Home team wears [color], Away team wears [color]. Verify team assignment before recording each event."`,
    }),
  },
  wrong_player: {
    type: 'add_constraint',
    generator: (p) => ({
      title: 'Jersey number reading errors',
      description: `${p.count} events had the wrong player identified. Jersey numbers are being misread.`,
      suggestedChange: `Add to prompt: "When reading jersey numbers, look for the number on BOTH front and back of jersey. If unclear, note 'jersey unclear' rather than guessing. Common confusions: 1/7, 3/8, 6/9, 11/17."`,
    }),
  },
  unclear: {
    type: 'add_constraint',
    generator: (p) => ({
      title: 'Too many uncertain events being reported',
      description: `${p.count} events were too unclear to verify. The model is reporting events it can't clearly see.`,
      suggestedChange: `Add to prompt: "If camera angle, video quality, or player occlusion makes an event unclear, do NOT report it. Only report events you can clearly verify."`,
    }),
  },
};

/**
 * Analyze recent rejections and generate suggestions
 */
export async function generatePromptSuggestions(): Promise<PromptSuggestionResult[]> {
  // Get rejections from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentCorrections = await db
    .select()
    .from(corrections)
    .where(gte(corrections.createdAt, thirtyDaysAgo))
    .orderBy(desc(corrections.createdAt));

  // Filter to rejections only
  const rejections = recentCorrections.filter((c) => {
    const data = c.correctedData as any;
    return data?.action === 'reject';
  });

  if (rejections.length === 0) {
    return [];
  }

  // Group by rejection reason
  const patterns: Record<string, RejectionPattern> = {};

  for (const rejection of rejections) {
    const data = rejection.correctedData as any;
    const originalData = rejection.originalData as any;
    const reason = data?.rejectionReason || 'unknown';
    const eventType = originalData?.type || 'unknown';

    if (!patterns[reason]) {
      patterns[reason] = {
        reason,
        count: 0,
        eventTypes: {},
        examples: [],
      };
    }

    patterns[reason].count++;
    patterns[reason].eventTypes[eventType] = (patterns[reason].eventTypes[eventType] || 0) + 1;

    // Keep up to 5 examples
    if (patterns[reason].examples.length < 5) {
      const timestamp = originalData?.timestamp || 'N/A';
      const team = originalData?.team || 'N/A';
      patterns[reason].examples.push(`${eventType} at ${timestamp} (${team} team)`);
    }
  }

  // Generate suggestions for each pattern
  const suggestions: PromptSuggestionResult[] = [];

  for (const [reason, pattern] of Object.entries(patterns)) {
    // Skip if too few rejections
    if (pattern.count < 3) continue;

    const suggestionConfig = REJECTION_TO_SUGGESTION[reason];
    if (!suggestionConfig) continue;

    const generated = suggestionConfig.generator(pattern);

    // Determine priority based on count and percentage
    const totalRejections = rejections.length;
    const percentage = (pattern.count / totalRejections) * 100;
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (pattern.count >= 20 || percentage >= 40) {
      priority = 'critical';
    } else if (pattern.count >= 10 || percentage >= 25) {
      priority = 'high';
    } else if (pattern.count >= 5 || percentage >= 15) {
      priority = 'medium';
    }

    // Determine which agent(s) this affects
    const topEventTypes = Object.keys(pattern.eventTypes);
    let agentType = 'offensive'; // default

    if (topEventTypes.some((t) => ['rebound', 'steal', 'block'].includes(t))) {
      agentType = 'defensive';
    } else if (topEventTypes.includes('scoring')) {
      agentType = 'game_flow';
    }

    suggestions.push({
      agentType,
      suggestionType: suggestionConfig.type,
      priority,
      title: generated.title || 'Prompt improvement needed',
      description: generated.description || `${pattern.count} related rejections found.`,
      suggestedChange: generated.suggestedChange,
      basedOnRejections: pattern.count,
      rejectionReasons: { [reason]: pattern.count },
    });
  }

  // Sort by priority (critical first)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

/**
 * Save generated suggestions to database
 */
export async function savePromptSuggestions(suggestions: PromptSuggestionResult[]): Promise<void> {
  for (const suggestion of suggestions) {
    // Check if similar suggestion already exists
    const [existing] = await db
      .select()
      .from(promptSuggestions)
      .where(eq(promptSuggestions.title, suggestion.title))
      .limit(1);

    if (existing && existing.status === 'pending') {
      // Update existing with new rejection count
      await db
        .update(promptSuggestions)
        .set({
          basedOnRejections: suggestion.basedOnRejections,
          rejectionReasons: suggestion.rejectionReasons,
          priority: suggestion.priority,
        })
        .where(eq(promptSuggestions.id, existing.id));
    } else if (!existing) {
      // Insert new suggestion
      await db.insert(promptSuggestions).values({
        agentType: suggestion.agentType,
        suggestionType: suggestion.suggestionType,
        priority: suggestion.priority,
        title: suggestion.title,
        description: suggestion.description,
        suggestedChange: suggestion.suggestedChange,
        basedOnRejections: suggestion.basedOnRejections,
        rejectionReasons: suggestion.rejectionReasons,
      });
    }
  }
}

/**
 * Get pending prompt suggestions
 */
export async function getPendingSuggestions() {
  return db
    .select()
    .from(promptSuggestions)
    .where(eq(promptSuggestions.status, 'pending'))
    .orderBy(
      sql`CASE
        WHEN ${promptSuggestions.priority} = 'critical' THEN 0
        WHEN ${promptSuggestions.priority} = 'high' THEN 1
        WHEN ${promptSuggestions.priority} = 'medium' THEN 2
        ELSE 3
      END`,
      desc(promptSuggestions.createdAt)
    );
}

/**
 * Mark a suggestion as implemented
 */
export async function markSuggestionImplemented(
  suggestionId: string,
  implementedInVersion: string,
  reviewedBy: string
): Promise<void> {
  await db
    .update(promptSuggestions)
    .set({
      status: 'implemented',
      implementedInVersion,
      reviewedAt: new Date(),
      reviewedBy,
    })
    .where(eq(promptSuggestions.id, suggestionId));
}

/**
 * Dismiss a suggestion
 */
export async function dismissSuggestion(
  suggestionId: string,
  reviewedBy: string
): Promise<void> {
  await db
    .update(promptSuggestions)
    .set({
      status: 'dismissed',
      reviewedAt: new Date(),
      reviewedBy,
    })
    .where(eq(promptSuggestions.id, suggestionId));
}
