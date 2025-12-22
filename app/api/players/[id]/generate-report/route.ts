import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import {
  detectedPlayers,
  detectedTeams,
  detectedPlays,
  playerAnalysis,
  keyMoments,
  games,
  playerPlayInvolvement,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { anthropic, MODELS } from '@/lib/ai/client';

/**
 * Generate Scouting Report API
 *
 * Uses Claude to generate professional scouting reports based on:
 * - Player tracking data (positions, movement)
 * - Play-by-play involvement
 * - Key moments
 * - Game context
 */

interface PlayInvolvement {
  playType: string | null;
  role: string | null;
  timestamp: number;
}

interface KeyMomentData {
  type: string;
  timestamp: number | null;
  description: string | null;
  sentiment: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params;

    // Get player with all related data
    const [player] = await db
      .select({
        id: detectedPlayers.id,
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
        positionGuess: detectedPlayers.positionGuess,
        framesVisible: detectedPlayers.framesVisible,
        trackingId: detectedPlayers.trackingId,
        teamId: detectedPlayers.detectedTeamId,
        gameId: detectedPlayers.gameId,
      })
      .from(detectedPlayers)
      .where(eq(detectedPlayers.id, playerId));

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get game info
    const [game] = await db
      .select({
        sport: games.sport,
        name: games.name,
        title: games.title,
      })
      .from(games)
      .where(eq(games.id, player.gameId));

    // Get team info
    const team = player.teamId ? (await db
      .select({
        teamName: detectedTeams.teamName,
        teamLabel: detectedTeams.teamLabel,
        primaryColor: detectedTeams.primaryJerseyColor,
      })
      .from(detectedTeams)
      .where(eq(detectedTeams.id, player.teamId)))[0] : null;

    // Get play involvements
    const involvements = await db
      .select({
        playType: detectedPlays.playType,
        role: playerPlayInvolvement.role,
        startTimestamp: detectedPlays.startTimestamp,
      })
      .from(playerPlayInvolvement)
      .innerJoin(detectedPlays, eq(detectedPlays.id, playerPlayInvolvement.playId))
      .where(eq(playerPlayInvolvement.detectedPlayerId, playerId));

    // Get key moments
    const moments = await db
      .select({
        momentType: keyMoments.momentType,
        timestampSeconds: keyMoments.timestampSeconds,
        description: keyMoments.description,
        sentiment: keyMoments.sentiment,
      })
      .from(keyMoments)
      .where(eq(keyMoments.detectedPlayerId, playerId));

    // Get all plays in the game for context
    const allPlays = await db
      .select({
        playType: detectedPlays.playType,
        playNumber: detectedPlays.playNumber,
        startTimestamp: detectedPlays.startTimestamp,
        yardsGained: detectedPlays.yardsGained,
        shotAttempted: detectedPlays.shotAttempted,
        shotMade: detectedPlays.shotMade,
        turnover: detectedPlays.turnover,
      })
      .from(detectedPlays)
      .where(eq(detectedPlays.gameId, player.gameId));

    // Build context for Claude
    const sport = game?.sport || 'football';
    const playerName = player.displayName || `#${player.jerseyNumber}` || `Player ${player.trackingId}`;
    const teamName = team?.teamName || team?.teamLabel || 'Unknown Team';
    const position = player.positionGuess || 'Unknown Position';

    // Summarize play involvement
    const playTypeCounts: Record<string, { total: number; roles: Record<string, number> }> = {};
    for (const inv of involvements) {
      const type = inv.playType || 'Unknown';
      if (!playTypeCounts[type]) {
        playTypeCounts[type] = { total: 0, roles: {} };
      }
      playTypeCounts[type].total++;
      if (inv.role) {
        playTypeCounts[type].roles[inv.role] = (playTypeCounts[type].roles[inv.role] || 0) + 1;
      }
    }

    // Build the prompt
    const systemPrompt = `You are an elite sports scout writing professional scouting reports. Your reports are:
- Objective and data-driven
- Written like a real scout would write them
- Focused on actionable insights
- Specific with examples and timestamps
- Honest about both strengths and areas for development

Format your report with these sections:
1. OVERALL GRADE (0-100)
2. SUMMARY (2-3 sentences)
3. KEY TENDENCIES (bullet points with specific observations)
4. STRENGTHS (specific examples)
5. DEVELOPMENT AREAS (actionable feedback)
6. KEY MOMENTS (reference specific plays/timestamps)`;

    const userPrompt = `Generate a professional scouting report for this ${sport} player:

PLAYER INFO:
- Name/Number: ${playerName}
- Team: ${teamName}
- Position: ${position}
- Frames Visible: ${player.framesVisible || 'Unknown'}

PLAY INVOLVEMENT (${involvements.length} plays):
${Object.entries(playTypeCounts).map(([type, stats]) =>
  `- ${type}: ${stats.total} plays${Object.keys(stats.roles).length > 0 ? ` (roles: ${Object.entries(stats.roles).map(([r, c]) => `${r}: ${c}`).join(', ')})` : ''}`
).join('\n') || 'No play data available'}

KEY MOMENTS (${moments.length} captured):
${moments.slice(0, 10).map(m =>
  `- [${m.timestampSeconds ? `${m.timestampSeconds}s` : 'N/A'}] ${m.momentType}: ${m.description || 'No description'} (${m.sentiment})`
).join('\n') || 'No key moments captured'}

GAME CONTEXT:
- Total plays in game: ${allPlays.length}
- Sport: ${sport}
${sport === 'basketball' ? `
- Shots attempted in game: ${allPlays.filter(p => p.shotAttempted).length}
- Shots made: ${allPlays.filter(p => p.shotMade).length}
- Turnovers: ${allPlays.filter(p => p.turnover).length}
` : ''}

Generate a complete scouting report. Be specific and reference the data provided. If data is limited, acknowledge that and provide observations based on what's available.`;

    // Call Claude
    const response = await anthropic.messages.create({
      model: MODELS.SMART,
      max_tokens: 2000,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });

    const reportText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Parse the report to extract structured data
    const gradeMatch = reportText.match(/OVERALL GRADE[:\s]*(\d+)/i);
    const overallGrade = gradeMatch ? parseInt(gradeMatch[1]) : 75;

    const summaryMatch = reportText.match(/SUMMARY[:\s]*\n([\s\S]*?)(?=\n\s*(?:KEY TENDENCIES|STRENGTHS|$))/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';

    const strengthsMatch = reportText.match(/STRENGTHS[:\s]*\n([\s\S]*?)(?=\n\s*(?:DEVELOPMENT|KEY MOMENTS|$))/i);
    const strengthsText = strengthsMatch ? strengthsMatch[1].trim() : '';
    const strengths = strengthsText
      .split(/\n[-•*]/)
      .map(s => s.trim())
      .filter(Boolean);

    const devMatch = reportText.match(/DEVELOPMENT AREAS?[:\s]*\n([\s\S]*?)(?=\n\s*(?:KEY MOMENTS|$))/i);
    const devText = devMatch ? devMatch[1].trim() : '';
    const developmentAreas = devText
      .split(/\n[-•*]/)
      .map(s => s.trim())
      .filter(Boolean);

    // Save or update player analysis
    const [existingAnalysis] = await db
      .select()
      .from(playerAnalysis)
      .where(eq(playerAnalysis.detectedPlayerId, playerId));

    const analysisData = {
      overallGrade: String(overallGrade),
      summary,
      fullReport: reportText,
      strengths,
      developmentAreas,
      metrics: {
        playsInvolved: involvements.length,
        keyMoments: moments.length,
        playTypeCounts,
      },
      updatedAt: new Date(),
    };

    if (existingAnalysis) {
      await db
        .update(playerAnalysis)
        .set(analysisData)
        .where(eq(playerAnalysis.id, existingAnalysis.id));
    } else {
      await db.insert(playerAnalysis).values({
        detectedPlayerId: playerId,
        ...analysisData,
      });
    }

    return NextResponse.json({
      success: true,
      playerId,
      overallGrade,
      summary,
      fullReport: reportText,
      strengths,
      developmentAreas,
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
