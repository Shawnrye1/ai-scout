/**
 * Active Learning Loop - Correction Analysis
 *
 * Analyzes human corrections to identify patterns and improve prompts.
 * This is the training feedback loop for the AI.
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { corrections, games } from '../lib/db/schema';
import { desc, sql } from 'drizzle-orm';

interface CorrectionPattern {
  statType: string;
  errorType: string;
  count: number;
  examples: any[];
}

interface AccuracyMetrics {
  totalReviewed: number;
  verified: number;
  rejected: number;
  verificationRate: number;
  byStatType: Record<string, { verified: number; rejected: number; rate: number }>;
  byRejectionReason: Record<string, number>;
  recentTrend: 'improving' | 'declining' | 'stable';
}

async function analyzeCorrections(): Promise<AccuracyMetrics> {
  console.log('='.repeat(60));
  console.log('ACTIVE LEARNING: CORRECTION ANALYSIS');
  console.log('='.repeat(60));
  console.log('');

  // Get all corrections
  const allCorrections = await db
    .select()
    .from(corrections)
    .orderBy(desc(corrections.createdAt));

  if (allCorrections.length === 0) {
    console.log('No corrections found yet. Review some events first!');
    return {
      totalReviewed: 0,
      verified: 0,
      rejected: 0,
      verificationRate: 0,
      byStatType: {},
      byRejectionReason: {},
      recentTrend: 'stable',
    };
  }

  console.log(`Found ${allCorrections.length} corrections\n`);

  // Categorize corrections
  let verified = 0;
  let rejected = 0;
  const byStatType: Record<string, { verified: number; rejected: number }> = {};
  const byRejectionReason: Record<string, number> = {};
  const patterns: CorrectionPattern[] = [];

  for (const correction of allCorrections) {
    const correctedData = correction.correctedData as any;
    const originalData = correction.originalData as any;
    const statType = originalData?.type || 'unknown';

    // Initialize stat type tracking
    if (!byStatType[statType]) {
      byStatType[statType] = { verified: 0, rejected: 0 };
    }

    if (correctedData?.action === 'verify') {
      verified++;
      byStatType[statType].verified++;
    } else {
      rejected++;
      byStatType[statType].rejected++;

      // Track rejection reasons
      const reason = correctedData?.rejectionReason || 'unknown';
      byRejectionReason[reason] = (byRejectionReason[reason] || 0) + 1;
    }
  }

  const verificationRate = allCorrections.length > 0 ? (verified / allCorrections.length) * 100 : 0;

  // Print summary
  console.log('=== OVERALL ACCURACY ===\n');
  console.log(`Total Reviewed: ${allCorrections.length}`);
  console.log(`Verified: ${verified} (${verificationRate.toFixed(1)}%)`);
  console.log(`Rejected: ${rejected} (${(100 - verificationRate).toFixed(1)}%)`);

  console.log('\n=== BY STAT TYPE ===\n');
  for (const [type, stats] of Object.entries(byStatType)) {
    const total = stats.verified + stats.rejected;
    const rate = total > 0 ? (stats.verified / total) * 100 : 0;
    console.log(`${type}: ${stats.verified}/${total} verified (${rate.toFixed(1)}%)`);
  }

  console.log('\n=== REJECTION REASONS ===\n');
  for (const [reason, count] of Object.entries(byRejectionReason)) {
    console.log(`${reason}: ${count}`);
  }

  // Calculate rates with proper typing
  const byStatTypeWithRate: Record<string, { verified: number; rejected: number; rate: number }> = {};
  for (const [type, stats] of Object.entries(byStatType)) {
    const total = stats.verified + stats.rejected;
    byStatTypeWithRate[type] = {
      ...stats,
      rate: total > 0 ? (stats.verified / total) * 100 : 0,
    };
  }

  return {
    totalReviewed: allCorrections.length,
    verified,
    rejected,
    verificationRate,
    byStatType: byStatTypeWithRate,
    byRejectionReason,
    recentTrend: 'stable', // Would compare to historical data
  };
}

function generatePromptImprovements(metrics: AccuracyMetrics): string[] {
  const improvements: string[] = [];

  console.log('\n=== PROMPT IMPROVEMENT SUGGESTIONS ===\n');

  // Check for problematic stat types
  for (const [type, stats] of Object.entries(metrics.byStatType)) {
    if (stats.rate < 70 && (stats.verified + stats.rejected) >= 3) {
      improvements.push(`${type.toUpperCase()}: Low accuracy (${stats.rate.toFixed(0)}%). Consider:`);

      // Specific suggestions based on rejection reasons
      if (type === 'rebound') {
        improvements.push('  - Add stricter criteria: "Player must have clear possession for at least 1 second"');
        improvements.push('  - Differentiate between "loose ball" and "controlled rebound"');
      }
      if (type === 'steal') {
        improvements.push('  - Emphasize: "Defender must ACTIVELY take ball, not just knock loose"');
        improvements.push('  - Add: "Defender\'s team must immediately gain possession"');
      }
      if (type === 'block') {
        improvements.push('  - Clarify: "Shot must be in upward trajectory, not goaltending"');
        improvements.push('  - Add: "Defender must make contact with the ball, not just the shooter"');
      }
    }
  }

  // Check for common rejection reasons
  if (metrics.byRejectionReason['not_real'] > 2) {
    improvements.push('\nFALSE POSITIVES: AI is detecting events that aren\'t happening.');
    improvements.push('  - Increase confidence threshold for auto-accept');
    improvements.push('  - Add negative examples to prompts');
  }

  if (metrics.byRejectionReason['wrong_type'] > 2) {
    improvements.push('\nMISCLASSIFICATION: AI is confusing stat types.');
    improvements.push('  - Add clearer distinctions between similar events');
    improvements.push('  - Example: "A deflection without possession change is NOT a steal"');
  }

  if (metrics.byRejectionReason['wrong_team'] > 1) {
    improvements.push('\nTEAM CONFUSION: AI is attributing stats to wrong team.');
    improvements.push('  - Emphasize jersey color identification');
    improvements.push('  - Add: "Track which team had possession before and after"');
  }

  if (improvements.length === 0) {
    console.log('No specific improvements needed - accuracy looks good!');
  } else {
    improvements.forEach((i) => console.log(i));
  }

  return improvements;
}

async function saveTrainingReport(metrics: AccuracyMetrics, improvements: string[]) {
  const report = {
    timestamp: new Date().toISOString(),
    metrics,
    improvements,
    nextActions: [
      'Review low-accuracy stat types',
      'Update prompts with suggested improvements',
      'Re-test on sample games',
      'Track accuracy trend over time',
    ],
  };

  const fs = await import('fs');
  fs.writeFileSync('/tmp/training-report.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved to /tmp/training-report.json');
}

async function main() {
  const metrics = await analyzeCorrections();
  const improvements = generatePromptImprovements(metrics);
  await saveTrainingReport(metrics, improvements);

  console.log('\n' + '='.repeat(60));
  console.log('NEXT STEPS');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Review more events in /admin/review');
  console.log('2. After 10+ reviews, run this script again');
  console.log('3. Apply suggested prompt improvements');
  console.log('4. Track accuracy improvement over time');
}

main().catch(console.error);
