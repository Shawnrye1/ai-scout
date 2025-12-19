import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { corrections } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total corrections count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(corrections);

    // Get unused corrections count
    const [unusedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(corrections)
      .where(eq(corrections.usedForTraining, false));

    // Get last exported correction
    const [lastExportResult] = await db
      .select({ createdAt: corrections.createdAt })
      .from(corrections)
      .where(eq(corrections.usedForTraining, true))
      .orderBy(sql`${corrections.createdAt} DESC`)
      .limit(1);

    return NextResponse.json({
      totalCorrections: totalResult?.count || 0,
      unusedCorrections: unusedResult?.count || 0,
      lastExport: lastExportResult?.createdAt || null,
    });
  } catch (error) {
    console.error('Failed to fetch model stats:', error);
    return NextResponse.json({
      totalCorrections: 0,
      unusedCorrections: 0,
      lastExport: null,
    });
  }
}
