import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/drizzle';
import { games, detectedTeams, detectedPlayers, detectedPlays, playerAnalysis, teamAnalysis, keyMoments, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendProcessingCompleteEmail, sendProcessingFailedEmail } from '@/lib/email/resend';

const WEBHOOK_SECRET = process.env.MODAL_WEBHOOK_SECRET || '';

function verifySignature(body: string, signature: string, bodySecret?: string): boolean {
  if (!WEBHOOK_SECRET) return true; // Skip verification in dev

  // Option 1: Check if secret is passed in body (simpler approach from Modal)
  if (bodySecret && bodySecret === WEBHOOK_SECRET) {
    return true;
  }

  // Option 2: Verify HMAC signature from header
  if (signature) {
    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    // Check length before timingSafeEqual to avoid crash
    if (signature.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('X-Webhook-Signature') || '';
    const data = JSON.parse(body);

    // Verify signature - check both header signature and body secret
    if (WEBHOOK_SECRET && !verifySignature(body, signature, data.secret || data.webhook_secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { gameId, game_id, status, progress, message, teams: teamsData, players: playersData, plays: playsData, reports, videoInfo, sport } = data;
    const resolvedGameId = gameId || game_id; // Handle both naming conventions

    if (!resolvedGameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    console.log(`[Modal Webhook] Game ${resolvedGameId}: status=${status}, progress=${progress}`);

    // Get the game and user info for email notifications
    const [game] = await db.select().from(games).where(eq(games.id, resolvedGameId)).limit(1);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Determine final status - if "analyzing" with data, it's actually "ready"
    const hasCompletionData = teamsData || playersData || data.players;
    const finalStatus = (status === 'analyzing' && hasCompletionData) ? 'ready' : status;

    // Handle duration_seconds (Modal sends as float, need to round for integer column)
    const durationSeconds = videoInfo?.durationSeconds || data.duration_seconds;
    const totalFrames = data.total_frames || data.totalFrames;

    // Update game status
    await db.update(games)
      .set({
        status: finalStatus,
        processingProgress: progress,
        processingError: status === 'failed' ? message : null,
        sport: sport || game.sport,
        videoDurationSeconds: durationSeconds ? Math.round(durationSeconds) : game.videoDurationSeconds,
        updatedAt: new Date(),
      })
      .where(eq(games.id, resolvedGameId));

    // Handle failed processing
    if (status === 'failed') {
      const [user] = await db.select().from(users).where(eq(users.id, game.userId)).limit(1);
      if (user) {
        sendProcessingFailedEmail(
          user.email,
          game.name || game.title || 'Game',
          message || 'An unexpected error occurred during processing.'
        ).catch(console.error);
      }
      return NextResponse.json({ success: true });
    }

    // If processing is complete, save all the analysis data
    // Accept both 'ready' and 'analyzing' status (Modal sends 'analyzing' at completion)
    const isComplete = (status === 'ready' || status === 'analyzing') && (teamsData || playersData || data.players);
    const finalPlayersData = playersData || data.players || [];

    if (isComplete) {
      console.log(`[Modal Webhook] Processing complete for game ${resolvedGameId}, saving analysis...`);

      let totalPlayers = 0;
      let totalPlays = playsData?.length || 0;

      // Create a map to track ML team ID -> DB team ID
      const teamIdMap = new Map<string, string>();

      // If no teams data, create a default team
      const finalTeamsData = teamsData || [{
        teamLabel: 'Team A',
        teamName: 'Detected Team',
        primaryColor: '#000000',
        playerTrackIds: finalPlayersData.map((p: any) => p.track_id || p.trackId || p.id),
        isUserTeam: true,
      }];

      // Save teams
      for (const team of finalTeamsData) {
        const [insertedTeam] = await db.insert(detectedTeams)
          .values({
            gameId: resolvedGameId,
            teamLabel: team.teamLabel || team.label,
            teamName: team.teamName || team.name || team.teamLabel || team.label,
            primaryJerseyColor: team.primaryColor || team.jerseyColor,
            secondaryJerseyColor: team.secondaryColor,
            playerCount: team.playerCount || team.playerTrackIds?.length || 0,
            isUserTeam: team.isUserTeam || false,
          })
          .returning();

        // Map ML team ID to DB team ID
        const mlTeamId = team.teamId || team.id || team.teamLabel;
        teamIdMap.set(mlTeamId, insertedTeam.id);

        // Save team analysis if available
        const teamReport = reports?.teamReports?.[mlTeamId] || reports?.teams?.[mlTeamId];
        if (teamReport) {
          await db.insert(teamAnalysis).values({
            detectedTeamId: insertedTeam.id,
            formationBreakdown: teamReport.formationBreakdown || teamReport.formations,
            playTypeBreakdown: teamReport.playTypeBreakdown || teamReport.playTypes,
            tendencies: teamReport.tendencies,
            tendenciesReport: typeof teamReport === 'string' ? teamReport : teamReport.report || teamReport.tendenciesReport,
            offensiveMetrics: teamReport.offensiveMetrics,
            defensiveMetrics: teamReport.defensiveMetrics,
          });
        }

        // Save players for this team
        const teamPlayerIds = team.playerTrackIds || team.players || [];
        for (const player of finalPlayersData) {
          const playerTrackId = String(player.trackId || player.track_id || player.id);
          // If no team IDs specified, include all players (default team case)
          const isOnTeam = teamPlayerIds.length === 0 ||
                           teamPlayerIds.includes(player.trackId) ||
                           teamPlayerIds.includes(player.track_id) ||
                           teamPlayerIds.includes(playerTrackId) ||
                           player.teamId === mlTeamId ||
                           player.team === mlTeamId;

          if (isOnTeam) {
            const [insertedPlayer] = await db.insert(detectedPlayers)
              .values({
                gameId: resolvedGameId,
                detectedTeamId: insertedTeam.id,
                trackingId: playerTrackId,
                jerseyNumber: player.jerseyNumber != null ? String(player.jerseyNumber) : null,
                jerseyNumberConfidence: player.jerseyConfidence ? String(player.jerseyConfidence) : null,
                displayName: player.jerseyNumber != null ? `#${player.jerseyNumber}` : `Player ${player.trackId || player.id}`,
                positionGuess: player.position || player.positionGuess,
                framesVisible: player.framesVisible || player.frameCount,
                thumbnailUrl: player.thumbnailUrl || player.thumbnail,
              })
              .returning();

            totalPlayers++;

            // Save player analysis if available
            const playerReport = reports?.playerReports?.[playerTrackId] ||
                                  reports?.players?.[playerTrackId] ||
                                  reports?.playerReports?.[player.trackId];
            if (playerReport) {
              await db.insert(playerAnalysis).values({
                detectedPlayerId: insertedPlayer.id,
                overallGrade: playerReport.grade != null ? String(playerReport.grade) :
                              playerReport.overallGrade != null ? String(playerReport.overallGrade) : null,
                summary: playerReport.summary,
                fullReport: playerReport.fullReport || playerReport.report,
                strengths: playerReport.strengths,
                developmentAreas: playerReport.developmentAreas || playerReport.weaknesses,
                tendencies: playerReport.tendencies,
                metrics: playerReport.metrics,
                athleticismGrade: playerReport.athleticismGrade ? String(playerReport.athleticismGrade) : null,
                techniqueGrade: playerReport.techniqueGrade ? String(playerReport.techniqueGrade) : null,
                decisionMakingGrade: playerReport.decisionMakingGrade ? String(playerReport.decisionMakingGrade) : null,
                consistencyGrade: playerReport.consistencyGrade ? String(playerReport.consistencyGrade) : null,
              });
            }

            // Save key moments if available
            const moments = playerReport?.keyMoments || playerReport?.highlights || [];
            for (const moment of moments) {
              await db.insert(keyMoments).values({
                detectedPlayerId: insertedPlayer.id,
                timestampSeconds: moment.timestamp != null ? String(moment.timestamp) : null,
                momentType: moment.type || moment.momentType || 'notable',
                sentiment: moment.sentiment || 'neutral',
                description: moment.description || moment.text,
                thumbnailUrl: moment.thumbnailUrl,
              });
            }
          }
        }
      }

      // Save plays
      if (playsData) {
        for (const play of playsData) {
          const possessionTeamDbId = play.possessionTeamId ? teamIdMap.get(play.possessionTeamId) : null;

          await db.insert(detectedPlays).values({
            gameId: resolvedGameId,
            playNumber: play.playNumber || play.number,
            startTimestamp: play.startTime != null ? String(play.startTime) : null,
            endTimestamp: play.endTime != null ? String(play.endTime) : null,
            startTime: play.startFrame || play.frameStart,
            endTime: play.endFrame || play.frameEnd,
            formation: play.formation,
            playType: play.playType || play.type || 'unknown',
            playDirection: play.direction || play.playDirection,
            yardsGained: play.yardsGained || play.yards,
            down: play.down,
            distance: play.distance,
            possessionTeamId: possessionTeamDbId,
            shotAttempted: play.shotAttempted,
            shotMade: play.shotMade,
            shotType: play.shotType,
            turnover: play.turnover,
            thumbnailUrl: play.thumbnailUrl || play.thumbnail,
            confidence: play.confidence != null ? String(play.confidence) : null,
            rawData: play.rawData || play.raw,
          });
        }
      }

      console.log(`[Modal Webhook] Saved ${totalPlayers} players and ${totalPlays} plays for game ${resolvedGameId}`);

      // Trigger clip extraction for Label Studio (fire-and-forget)
      if (totalPlays > 0) {
        const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/games/${resolvedGameId}/extract-clips`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).then(res => {
          if (res.ok) {
            console.log(`[Modal Webhook] Triggered clip extraction for game ${resolvedGameId}`);
          } else {
            console.error(`[Modal Webhook] Failed to trigger clip extraction: ${res.status}`);
          }
        }).catch(err => {
          console.error(`[Modal Webhook] Error triggering clip extraction:`, err);
        });
      }

      // Send completion email
      const [user] = await db.select().from(users).where(eq(users.id, game.userId)).limit(1);
      if (user) {
        sendProcessingCompleteEmail(
          user.email,
          game.name || game.title || 'Game',
          resolvedGameId,
          { players: totalPlayers, plays: totalPlays }
        ).catch(console.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Modal webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
