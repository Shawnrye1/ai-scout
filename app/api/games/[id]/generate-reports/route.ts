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
import { eq } from 'drizzle-orm';
import { anthropic, MODELS } from '@/lib/ai/client';

/**
 * Batch Generate Scouting Reports
 *
 * Generates reports for all players in a game who don't have one yet,
 * or regenerates all if force=true is passed.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    const body = await request.json().catch(() => ({}));
    const forceRegenerate = body.force === true;

    // Get game info
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get all players in the game
    const players = await db
      .select({
        id: detectedPlayers.id,
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
        positionGuess: detectedPlayers.positionGuess,
        framesVisible: detectedPlayers.framesVisible,
        trackingId: detectedPlayers.trackingId,
        teamId: detectedPlayers.detectedTeamId,
        teamName: detectedTeams.teamName,
        teamLabel: detectedTeams.teamLabel,
        hasAnalysis: playerAnalysis.id,
      })
      .from(detectedPlayers)
      .leftJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
      .leftJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
      .where(eq(detectedPlayers.gameId, gameId));

    // Filter to players needing reports
    const playersToProcess = forceRegenerate
      ? players
      : players.filter(p => !p.hasAnalysis);

    if (playersToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All players already have reports',
        generated: 0,
        total: players.length,
      });
    }

    // Get all plays for context
    const allPlays = await db
      .select()
      .from(detectedPlays)
      .where(eq(detectedPlays.gameId, gameId));

    const results: { playerId: string; success: boolean; grade?: number; error?: string }[] = [];

    // Process each player
    for (const player of playersToProcess) {
      try {
        // Get play involvements
        const involvements = await db
          .select({
            playType: detectedPlays.playType,
            role: playerPlayInvolvement.role,
          })
          .from(playerPlayInvolvement)
          .innerJoin(detectedPlays, eq(detectedPlays.id, playerPlayInvolvement.playId))
          .where(eq(playerPlayInvolvement.detectedPlayerId, player.id));

        // Get key moments
        const moments = await db
          .select()
          .from(keyMoments)
          .where(eq(keyMoments.detectedPlayerId, player.id));

        // Build play type summary
        const playTypeCounts: Record<string, { total: number; roles: Record<string, number> }> = {};
        for (const inv of involvements) {
          const type = inv.playType || 'Unknown';
          if (!playTypeCounts[type]) playTypeCounts[type] = { total: 0, roles: {} };
          playTypeCounts[type].total++;
          if (inv.role) {
            playTypeCounts[type].roles[inv.role] = (playTypeCounts[type].roles[inv.role] || 0) + 1;
          }
        }

        const sport = game.sport || 'football';
        const playerName = player.displayName || `#${player.jerseyNumber}` || `Player ${player.trackingId}`;
        const teamName = player.teamName || player.teamLabel || 'Unknown Team';

        // Generate report with Claude
        const response = await anthropic.messages.create({
          model: MODELS.FAST, // Use faster model for batch
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: `Generate a brief scouting report for this ${sport} player:

PLAYER: ${playerName} (${player.positionGuess || 'Unknown Position'}) - ${teamName}
PLAYS INVOLVED: ${involvements.length}
${Object.entries(playTypeCounts).map(([type, stats]) =>
  `- ${type}: ${stats.total} plays`
).join('\n') || 'No play data'}
KEY MOMENTS: ${moments.length}

Provide:
1. OVERALL GRADE (0-100)
2. SUMMARY (2 sentences)
3. TOP 3 STRENGTHS
4. TOP 2 DEVELOPMENT AREAS`
          }],
          system: 'You are a professional sports scout. Write concise, data-driven reports. Be specific and honest.',
        });

        const reportText = response.content[0].type === 'text' ? response.content[0].text : '';
        const gradeMatch = reportText.match(/OVERALL GRADE[:\s]*(\d+)/i);
        const overallGrade = gradeMatch ? parseInt(gradeMatch[1]) : 75;

        const summaryMatch = reportText.match(/SUMMARY[:\s]*\n?([\s\S]*?)(?=\n\s*(?:TOP|STRENGTHS|$))/i);
        const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 500) : '';

        // Save to database
        const analysisData = {
          overallGrade: String(overallGrade),
          summary,
          fullReport: reportText,
          metrics: { playsInvolved: involvements.length, keyMoments: moments.length, playTypeCounts },
          updatedAt: new Date(),
        };

        if (player.hasAnalysis) {
          await db.update(playerAnalysis)
            .set(analysisData)
            .where(eq(playerAnalysis.detectedPlayerId, player.id));
        } else {
          await db.insert(playerAnalysis).values({
            detectedPlayerId: player.id,
            ...analysisData,
          });
        }

        results.push({ playerId: player.id, success: true, grade: overallGrade });
      } catch (err) {
        results.push({
          playerId: player.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      generated: successCount,
      failed: results.length - successCount,
      total: players.length,
      results,
    });
  } catch (error) {
    console.error('Failed to generate reports:', error);
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    );
  }
}
