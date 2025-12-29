import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { corrections, games } from '@/lib/db/schema';
import { desc, sql, eq, gte } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all corrections
    const allCorrections = await db
      .select()
      .from(corrections)
      .orderBy(desc(corrections.createdAt));

    if (allCorrections.length === 0) {
      return NextResponse.json({
        totalReviewed: 0,
        verified: 0,
        rejected: 0,
        verificationRate: 0,
        byStatType: {},
        byRejectionReason: {},
        improvements: ['No corrections yet - review events in /admin/review to start training'],
        recentActivity: [],
      });
    }

    // Categorize corrections
    let verified = 0;
    let rejected = 0;
    const byStatType: Record<string, { verified: number; rejected: number }> = {};
    const byRejectionReason: Record<string, number> = {};

    for (const correction of allCorrections) {
      const correctedData = correction.correctedData as any;
      const originalData = correction.originalData as any;
      const statType = originalData?.type || 'unknown';

      if (!byStatType[statType]) {
        byStatType[statType] = { verified: 0, rejected: 0 };
      }

      if (correctedData?.action === 'verify') {
        verified++;
        byStatType[statType].verified++;
      } else {
        rejected++;
        byStatType[statType].rejected++;
        const reason = correctedData?.rejectionReason || 'unknown';
        byRejectionReason[reason] = (byRejectionReason[reason] || 0) + 1;
      }
    }

    const verificationRate = (verified / allCorrections.length) * 100;

    // Calculate rates with proper typing
    const byStatTypeWithRate: Record<string, { verified: number; rejected: number; rate: number }> = {};
    for (const [type, stats] of Object.entries(byStatType)) {
      const total = stats.verified + stats.rejected;
      byStatTypeWithRate[type] = {
        ...stats,
        rate: total > 0 ? (stats.verified / total) * 100 : 0,
      };
    }

    // Generate improvement suggestions
    const improvements: string[] = [];
    for (const [type, stats] of Object.entries(byStatTypeWithRate)) {
      if (stats.rate < 70 && (stats.verified + stats.rejected) >= 3) {
        improvements.push(`${type}: Low accuracy (${stats.rate.toFixed(0)}%) - needs prompt refinement`);
      }
    }

    if (byRejectionReason['not_real'] > 2) {
      improvements.push('Many false positives - consider raising confidence threshold');
    }
    if (byRejectionReason['wrong_type'] > 2) {
      improvements.push('Stat type confusion - add clearer definitions to prompts');
    }

    // Recent activity (last 10)
    const recentActivity = allCorrections.slice(0, 10).map((c) => ({
      id: c.id,
      type: (c.originalData as any)?.type || 'unknown',
      action: (c.correctedData as any)?.action || 'unknown',
      reason: (c.correctedData as any)?.rejectionReason,
      notes: c.notes,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      totalReviewed: allCorrections.length,
      verified,
      rejected,
      verificationRate,
      byStatType: byStatTypeWithRate,
      byRejectionReason,
      improvements: improvements.length > 0 ? improvements : ['Accuracy looks good! Keep reviewing to improve.'],
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching training metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
