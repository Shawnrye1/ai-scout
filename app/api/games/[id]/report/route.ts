import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db/drizzle';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const anthropic = new Anthropic();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    // Get game with analysis
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const analysis = game.geminiAnalysis as any;
    if (!analysis) {
      return NextResponse.json({ error: 'No analysis found for game' }, { status: 400 });
    }

    const scoring = analysis.scoring || { home: 0, away: 0, verifiedEvents: [] };
    const stats = analysis.stats || { home: {}, away: {} };

    // Build scoring breakdown
    const scoringBreakdown = (scoring.verifiedEvents || [])
      .map((e: any) => `- ${e.team.toUpperCase()}: ${e.points}pt ${e.shotType} at ${e.timestamp}`)
      .join('\n');

    const prompt = `You are a professional basketball scout writing a game analysis report for coaches.

Based on the following game data, write a comprehensive scouting report:

GAME: ${game.name}
FINAL SCORE: HOME ${scoring.home} - AWAY ${scoring.away}

TEAM STATS:
HOME Team:
- Rebounds: ${stats.home?.rebounds || 0}
- Steals: ${stats.home?.steals || 0}
- Blocks: ${stats.home?.blocks || 0}
- Turnovers: ${stats.home?.turnovers || 0}
- Assists: ${stats.home?.assists || 0}

AWAY Team:
- Rebounds: ${stats.away?.rebounds || 0}
- Steals: ${stats.away?.steals || 0}
- Blocks: ${stats.away?.blocks || 0}
- Turnovers: ${stats.away?.turnovers || 0}
- Assists: ${stats.away?.assists || 0}

SCORING BREAKDOWN:
${scoringBreakdown || 'No detailed scoring events available'}

Write a professional scouting report that includes:
1. **Executive Summary** - Key takeaways from the game (2-3 sentences)
2. **Scoring Analysis** - How each team scored, shot selection, efficiency
3. **Defensive Analysis** - Steals, blocks, turnovers forced
4. **Rebounding** - Board control and second-chance opportunities
5. **Areas for Improvement** - Specific coaching points for each team
6. **Key Observations** - Notable patterns or tendencies

Format the report in clean markdown that a coach can easily read and share.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const report = (response.content[0] as any).text;

    // Save report to game
    await db
      .update(games)
      .set({
        geminiAnalysis: {
          ...analysis,
          coachReport: report,
          reportGeneratedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
