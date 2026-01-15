import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import {
  games,
  detectedTeams,
  detectedPlayers,
  playerAnalysis,
  keyMoments,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDownloadPresignedUrl } from "@/lib/storage/r2";
import { runMultiAgentAnalysis } from "@/lib/analysis/multi-agent-gemini";
import { addToScoutingReviewQueue } from "@/lib/analysis/scouting-few-shot";
import { type Sport } from "@/lib/analysis/sport-router";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Allow up to 5 minutes for video analysis (Vercel Pro max)
// This is needed because Gemini analysis involves downloading video,
// uploading to Gemini, running multiple agents, and storing results
export const maxDuration = 300;

/**
 * POST /api/games/[id]/analyze-gemini
 *
 * Trigger multi-agent two-pass Gemini analysis for a game.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: gameId } = await params;

    // Get game info
    const [game] = await db.select().from(games).where(eq(games.id, gameId));

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Get video URL
    let videoUrl = game.videoUrl;
    if (game.videoKey) {
      try {
        videoUrl = await getDownloadPresignedUrl(game.videoKey, 3600 * 4);
      } catch (e) {
        console.error("Failed to generate presigned URL:", e);
      }
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: "No video URL available" },
        { status: 400 },
      );
    }

    // Update status to analyzing
    await db
      .update(games)
      .set({
        status: "analyzing",
        processingProgress: 5,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    // Download video to temp file
    console.log("Downloading video for Gemini analysis...");
    const tempDir = path.join(os.tmpdir(), `gemini-${gameId}-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, "source.mp4");

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(videoBuffer));
    console.log(`Video downloaded to ${tempPath}`);

    // Determine sport (default to basketball for backwards compatibility)
    const sport: Sport = (game.sport as Sport) || "basketball";
    console.log(`Running ${sport} analysis for game ${gameId}`);

    // Run multi-agent analysis with progress updates
    const analysis = await runMultiAgentAnalysis(
      tempPath,
      async (progress, message) => {
        console.log(`[${progress}%] ${message}`);
        await db
          .update(games)
          .set({ processingProgress: progress })
          .where(eq(games.id, gameId));
      },
      game.boxScore || undefined, // Pass box score if available
      sport, // Pass the sport for sport-specific prompts
    );

    // Store results in database
    await storeAnalysisResults(gameId, analysis);

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Failed to clean up temp directory:", e);
    }

    // Mark game as ready, set annotation status based on review queue
    const hasReviewItems = (analysis.humanReviewQueue?.length || 0) > 0;
    await db
      .update(games)
      .set({
        status: "ready",
        processingProgress: 100,
        annotationStatus: hasReviewItems ? "pending" : "reviewed",
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    const playerCount = analysis.playerScouting?.players?.length || 0;

    return NextResponse.json({
      success: true,
      message: `Multi-agent ${sport} analysis complete`,
      analysis: {
        sport: analysis.sport,
        method: "multi-agent-two-pass",
        playersDetected: playerCount,
        homeTeam: analysis.homeTeamName,
        awayTeam: analysis.awayTeamName,
        events: {
          total: analysis.eventSummary?.totalEvents || 0,
          autoApproved: analysis.eventSummary?.autoApproved || 0,
          boxScoreValidated: analysis.eventSummary?.boxScoreValidated || 0,
          pendingReview: analysis.eventSummary?.pendingReview || 0,
          discrepancies: analysis.eventSummary?.discrepancies || [],
        },
      },
    });
  } catch (error) {
    console.error("Gemini analysis failed:", error);

    try {
      const { id: gameId } = await params;
      await db
        .update(games)
        .set({
          status: "failed",
          processingError:
            error instanceof Error ? error.message : "Analysis failed",
          updatedAt: new Date(),
        })
        .where(eq(games.id, gameId));
    } catch (e) {
      console.error("Failed to update game status:", e);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gemini analysis failed",
      },
      { status: 500 },
    );
  }
}

/**
 * Parse box score to extract player stats (handles multiple formats)
 *
 * IMPORTANT: Keep this in sync with parseBoxScore in:
 * - /lib/analysis/multi-agent-gemini.ts
 * - /scripts/reprocess-game-stats.ts
 */
function parseBoxScore(boxScore: string | null): Map<
  string,
  {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fgm: number;
    fga: number;
    threePm: number;
    threePa: number;
    ftm: number;
    fta: number;
  }
> {
  const playerStats = new Map();
  if (!boxScore) return playerStats;

  // Format 5: Human-readable format (most common for user input)
  // Example: #32 Cooper Flagg: 23pts, 10-17FG, 2-53PT, 1-2FT, 3reb, 5ast, 2stl, 8blk
  const format5Regex =
    /#(\d{1,2})\s+[^:]+:\s*(\d+)pts?,\s*(\d+)-(\d+)FG,\s*(\d+)-(\d+)3PT,\s*(\d+)-(\d+)FT,\s*(\d+)reb,\s*(\d+)ast,\s*(\d+)stl,\s*(\d+)blk/gi;

  let match;
  while ((match = format5Regex.exec(boxScore)) !== null) {
    const jersey = match[1];
    const pts = parseInt(match[2]) || 0;
    const fgm = parseInt(match[3]) || 0;
    const fga = parseInt(match[4]) || 0;
    const threePm = parseInt(match[5]) || 0;
    const threePa = parseInt(match[6]) || 0;
    const ftm = parseInt(match[7]) || 0;
    const fta = parseInt(match[8]) || 0;
    const reb = parseInt(match[9]) || 0;
    const ast = parseInt(match[10]) || 0;
    const stl = parseInt(match[11]) || 0;
    const blk = parseInt(match[12]) || 0;

    playerStats.set(jersey, {
      points: pts,
      rebounds: reb,
      assists: ast,
      steals: stl,
      blocks: blk,
      turnovers: 0,
      fgm,
      fga,
      threePm,
      threePa,
      ftm,
      fta,
    });
  }

  if (playerStats.size > 0) {
    console.log(
      `Parsed ${playerStats.size} players from box score (format 5 - human readable)`,
    );
    return playerStats;
  }

  // Format 1: Compact ESPN-style format (no spaces between stats)
  // Example: 01Robert Wright*5-121-43-4731412003214
  // Pattern: #{jersey}{name}*{FGM}-{FGA}{3PM}-{3PA}{FTM}-{FTA}{REB}{PF}{PTS}{AST}{TO}{BLK}{STL}{MIN}
  const format1Regex =
    /(\d{1,2})([A-Za-z\s\-']+)\*?(\d{1,2})-(\d{1,2})(\d{1,2})-(\d{1,2})(\d{1,2})-(\d{1,2})(\d{1,2})(\d)(\d{1,2})(\d{1,2})(\d)(\d)(\d)(\d)/g;

  while ((match = format1Regex.exec(boxScore)) !== null) {
    const jersey = match[1];
    const fgm = parseInt(match[3]) || 0;
    const fga = parseInt(match[4]) || 0;
    const threePm = parseInt(match[5]) || 0;
    const threePa = parseInt(match[6]) || 0;
    const ftm = parseInt(match[7]) || 0;
    const fta = parseInt(match[8]) || 0;
    const reb = parseInt(match[9]) || 0;
    const pts = parseInt(match[11]) || 0;
    const ast = parseInt(match[12]) || 0;
    const to = parseInt(match[13]) || 0;
    const blk = parseInt(match[14]) || 0;
    const stl = parseInt(match[15]) || 0;

    playerStats.set(jersey, {
      points: pts,
      rebounds: reb,
      assists: ast,
      steals: stl,
      blocks: blk,
      turnovers: to,
      fgm,
      fga,
      threePm,
      threePa,
      ftm,
      fta,
    });
  }

  if (playerStats.size > 0) {
    console.log(`Parsed ${playerStats.size} players from box score (format 1)`);
    return playerStats;
  }

  // Format 1.5: MaxPreps-style with Sr/Jr notation (NO turnovers column)
  // Header: #PlayerPtsFGM-A3PM-AFTM-AORebDRebRebAstStlBlk
  // Example: 32Cooper Flagg (Sr)2310-172-51-20310528
  // Example: 1R. Wright III (Sr)156-113-50-0033910
  // Pattern: {jersey}{Name (Grade)}{PTS}{FGM}-{FGA}{3PM}-{3PA}{FTM}-{FTA}{trailing_stats}
  // Trailing stats (6-8 digits): OREB(1d), DREB(1d), REB(1-2d), AST(1-2d), STL(1d), BLK(1d)
  // Name can include periods (R.), hyphens, apostrophes, and Roman numerals (III, IV)
  // Use lookahead to stop trailing stats before next player's jersey (digit followed by letter)
  const format15Regex =
    /(\d{1,2})([A-Za-z][A-Za-z\s\-'.]+(?:\s+[IVX]+)?)\s*\([A-Za-z]+\)(\d{1,2})(\d{1,2})-(\d{1,2})(\d)-(\d{1,2})(\d)-(\d)(\d{5,7})(?=\d[A-Za-z]|TEAM|$|\s)/g;

  while ((match = format15Regex.exec(boxScore)) !== null) {
    const jersey = match[1];
    const pts = parseInt(match[3]) || 0;
    const fgm = parseInt(match[4]) || 0;
    const fga = parseInt(match[5]) || 0;
    const threePm = parseInt(match[6]) || 0;
    const threePa = parseInt(match[7]) || 0;
    const ftm = parseInt(match[8]) || 0;
    const fta = parseInt(match[9]) || 0;

    // Parse trailing stats: OREB(1), DREB(1), REB(1-2), AST(1-2), STL(1), BLK(1)
    // Note: Some box scores have an extra digit at the end (possibly turnovers or minutes)
    const trailingStats = match[10];
    const oreb = parseInt(trailingStats[0]) || 0;
    const dreb = parseInt(trailingStats[1]) || 0;

    // REB should logically be >= OREB + DREB
    // Use this to determine if REB is 1 or 2 digits
    let reb: number, ast: number, stl: number, blk: number;
    const remaining = trailingStats.substring(2);

    // Try 2-digit REB first
    const twoDigitReb = parseInt(remaining.substring(0, 2)) || 0;
    const oneDigitReb = parseInt(remaining[0]) || 0;

    // If 2-digit REB is reasonable (close to oreb + dreb and not too large for one player)
    // and we have enough remaining digits (5+ for AST, STL, BLK + possibly extra)
    if (
      remaining.length >= 5 &&
      twoDigitReb >= oreb + dreb &&
      twoDigitReb <= 25
    ) {
      reb = twoDigitReb;
      const afterReb = remaining.substring(2);
      ast = parseInt(afterReb[0]) || 0;
      stl = parseInt(afterReb[1]) || 0;
      blk = parseInt(afterReb[2]) || 0;
    } else {
      // Use 1-digit REB - verify it's reasonable
      reb = oneDigitReb;
      const afterReb = remaining.substring(1);
      // If we have 5+ digits remaining, AST might be 2 digits
      if (afterReb.length >= 5) {
        ast = parseInt(afterReb.substring(0, 2)) || 0;
        stl = parseInt(afterReb[2]) || 0;
        blk = parseInt(afterReb[3]) || 0;
      } else {
        ast = parseInt(afterReb[0]) || 0;
        stl = parseInt(afterReb[1]) || 0;
        blk = parseInt(afterReb[2]) || 0;
      }
    }

    playerStats.set(jersey, {
      points: pts,
      rebounds: reb,
      assists: ast,
      steals: stl,
      blocks: blk,
      turnovers: 0, // Not available in this format
      fgm,
      fga,
      threePm,
      threePa,
      ftm,
      fta,
    });
  }

  if (playerStats.size > 0) {
    console.log(
      `Parsed ${playerStats.size} players from box score (format 1.5 - MaxPreps)`,
    );
    return playerStats;
  }

  // Format 2: Condensed PTS-first format (all players on one line)
  // Example: 32Cooper Flagg215-90-211-1214 (4-10)31430Liam McNeeley155-93-42-45 (0-5)2002
  // Pattern: {jersey}{Name}{PTS}{FGM}-{FGA}{3PM}-{3PA}{FTM}-{FTA}{REB} ({O}-{D}){AST}{STL}{BLK}
  const playerEntries = boxScore.match(
    /(\d{1,2})([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+[IVX]+)?)\d{1,2}\d-\d.*?\(\d+-\d+\)\d{1,3}/g,
  );

  if (playerEntries && playerEntries.length > 0) {
    for (const entry of playerEntries) {
      const parts = entry.match(
        /^(\d{1,2})([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+[IVX]+)?)/,
      );
      if (!parts) continue;

      const jersey = parts[1];
      const name = parts[2];
      const statsStr = entry.substring(jersey.length + name.length);

      // Explicit pattern: PTS(1-2d) FGM(1d)-FGA(1d) 3PM(1d)-3PA(1d) FTM(1-2d)-FTA(1-2d) REB(1-2d) (O-D) AST STL BLK
      const fullMatch = statsStr.match(
        /^(\d{1,2})(\d)-(\d)(\d)-(\d)(\d{1,2})-(\d{1,2})(\d{1,2})\s*\(\d+-\d+\)(\d{1,2})(\d)(\d)/,
      );

      if (!fullMatch) continue;

      const pts = parseInt(fullMatch[1]) || 0;
      const fgm = parseInt(fullMatch[2]) || 0;
      const fga = parseInt(fullMatch[3]) || 0;
      const threePm = parseInt(fullMatch[4]) || 0;
      const threePa = parseInt(fullMatch[5]) || 0;
      const ftm = parseInt(fullMatch[6]) || 0;
      const fta = parseInt(fullMatch[7]) || 0;
      const reb = parseInt(fullMatch[8]) || 0;
      const ast = parseInt(fullMatch[9]) || 0;
      const stl = parseInt(fullMatch[10]) || 0;
      const blk = parseInt(fullMatch[11]) || 0;

      playerStats.set(jersey, {
        points: pts,
        rebounds: reb,
        assists: ast,
        steals: stl,
        blocks: blk,
        turnovers: 0,
        fgm,
        fga,
        threePm,
        threePa,
        ftm,
        fta,
      });
    }
  }

  console.log(`Parsed ${playerStats.size} players from box score`);
  return playerStats;
}

// Calculate overall grade based on stats
function calculateOverallGrade(
  stats: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
  } | null,
): number {
  if (!stats) return 70; // Default grade

  // Simple grading: base 60 + weighted stats contribution
  let grade = 60;
  grade += Math.min(stats.points * 1.5, 20); // Up to 20 points from scoring
  grade += Math.min(stats.rebounds * 2, 10); // Up to 10 from rebounds
  grade += Math.min(stats.assists * 2.5, 10); // Up to 10 from assists
  grade += Math.min((stats.steals + stats.blocks) * 3, 10); // Up to 10 from defensive plays

  return Math.min(Math.round(grade), 99);
}

async function storeAnalysisResults(gameId: string, analysis: any) {
  // Get box score from game record
  const [gameRecord] = await db
    .select({ boxScore: games.boxScore })
    .from(games)
    .where(eq(games.id, gameId));

  // Log box score status for debugging
  if (gameRecord?.boxScore) {
    console.log(
      `[BoxScore] Game ${gameId} has box score (${gameRecord.boxScore.length} chars)`,
    );
    console.log(
      `[BoxScore] First 100 chars: ${gameRecord.boxScore.substring(0, 100)}`,
    );
  } else {
    console.log(`[BoxScore] Game ${gameId} has NO box score`);
  }

  const boxScoreStats = parseBoxScore(gameRecord?.boxScore || null);
  console.log(`[BoxScore] Parsed ${boxScoreStats.size} players from box score`);

  // Store full analysis JSON on game record
  await db
    .update(games)
    .set({
      geminiAnalysis: analysis,
    })
    .where(eq(games.id, gameId));

  // Store teams
  const homeTeamName = analysis.homeTeamName || "Home";
  const awayTeamName = analysis.awayTeamName || "Away";
  const homeJerseyColor = analysis.teamScouting?.homeTeam?.jerseyColor;
  const awayJerseyColor = analysis.teamScouting?.awayTeam?.jerseyColor;

  await db
    .insert(detectedTeams)
    .values({
      gameId,
      teamLabel: "home",
      teamName: homeTeamName,
      primaryJerseyColor: homeJerseyColor || null,
      isUserTeam: true,
    })
    .onConflictDoNothing();

  await db
    .insert(detectedTeams)
    .values({
      gameId,
      teamLabel: "away",
      teamName: awayTeamName,
      primaryJerseyColor: awayJerseyColor || null,
      isUserTeam: false,
    })
    .onConflictDoNothing();

  // Get team IDs
  const dbTeams = await db
    .select()
    .from(detectedTeams)
    .where(eq(detectedTeams.gameId, gameId));

  const homeTeamId = dbTeams.find((t) => t.teamLabel === "home")?.id;
  const awayTeamId = dbTeams.find((t) => t.teamLabel === "away")?.id;

  // Store players
  const players = analysis.playerScouting?.players || [];
  for (const player of players) {
    const teamId = player.team === "home" ? homeTeamId : awayTeamId;
    const jerseyNumber = player.jerseyNumber || player.jersey;

    const [insertedPlayer] = await db
      .insert(detectedPlayers)
      .values({
        gameId,
        detectedTeamId: teamId || null,
        jerseyNumber: jerseyNumber,
        displayName: `#${jerseyNumber}`,
        positionGuess: player.position || null,
        jerseyNumberConfidence: "0.90",
      })
      .onConflictDoNothing()
      .returning();

    let playerId: string | undefined = insertedPlayer?.id;
    if (!playerId) {
      const existing = await db
        .select()
        .from(detectedPlayers)
        .where(eq(detectedPlayers.gameId, gameId))
        .then((players) =>
          players.find((p) => p.jerseyNumber === jerseyNumber),
        );
      playerId = existing?.id;
    }

    if (playerId) {
      // Get stats from box score - ONLY for home team (user's team)
      // Box score is provided by the user for their team only
      const isUserTeam = player.team === "home";
      const stats = isUserTeam
        ? boxScoreStats.get(String(jerseyNumber)) ||
          boxScoreStats.get(jerseyNumber?.toString().padStart(2, "0")) ||
          null
        : null;

      // Log stat matching
      if (stats) {
        console.log(
          `[BoxScore] #${jerseyNumber} (${player.team}): ${stats.points}pts, ${stats.rebounds}reb, ${stats.assists}ast`,
        );
      } else if (boxScoreStats.size > 0 && isUserTeam) {
        console.log(
          `[BoxScore] #${jerseyNumber} (${player.team}): NO MATCH in box score`,
        );
      } else if (!isUserTeam) {
        console.log(
          `[BoxScore] #${jerseyNumber} (${player.team}): Skipping - opponent team`,
        );
      }

      const overallGrade = calculateOverallGrade(stats);

      // Generate development areas based on tendencies
      const developmentAreas: string[] = [];
      if (
        player.defensiveRating === "average" ||
        player.defensiveRating === "below average"
      ) {
        developmentAreas.push("Defense");
      }
      if (player.preferredHand) {
        const weakHand =
          player.preferredHand === "right" ? "Left Hand" : "Right Hand";
        developmentAreas.push(`Develop ${weakHand}`);
      }
      if (stats && stats.turnovers > 3) {
        developmentAreas.push("Ball Security");
      }

      await db
        .insert(playerAnalysis)
        .values({
          detectedPlayerId: playerId,
          overallGrade: overallGrade.toString(),
          summary: player.overallAssessment,
          metrics: stats
            ? {
                points: stats.points,
                rebounds: stats.rebounds,
                assists: stats.assists,
                steals: stats.steals,
                blocks: stats.blocks,
                turnovers: stats.turnovers,
                fieldGoalsMade: stats.fgm,
                fieldGoalsAttempted: stats.fga,
                fieldGoalPercentage:
                  stats.fga > 0 ? Math.round((stats.fgm / stats.fga) * 100) : 0,
                threePointersMade: stats.threePm,
                threePointersAttempted: stats.threePa,
                threePointPercentage:
                  stats.threePa > 0
                    ? Math.round((stats.threePm / stats.threePa) * 100)
                    : 0,
                freeThrowsMade: stats.ftm,
                freeThrowsAttempted: stats.fta,
                freeThrowPercentage:
                  stats.fta > 0 ? Math.round((stats.ftm / stats.fta) * 100) : 0,
                gamesPlayed: 1,
              }
            : null,
          tendencies: {
            preferredHand: player.preferredHand,
            primaryMoves: player.primaryMoves,
            defensiveRating: player.defensiveRating,
          },
          strengths: {
            howToGuard: player.howToGuard,
            howToAttack: player.howToAttack,
          },
          developmentAreas:
            developmentAreas.length > 0 ? developmentAreas : null,
        })
        .onConflictDoNothing();

      // Create teaching moments for Film Session based on player weaknesses
      const teachingMoments: { type: string; description: string }[] = [];

      // Defensive rating issues
      if (
        player.defensiveRating === "below average" ||
        player.defensiveRating === "average"
      ) {
        teachingMoments.push({
          type: "defensive_breakdown",
          description: `#${jerseyNumber} - Defensive positioning and awareness needs attention. Work on help defense rotations and staying in front of the ball.`,
        });
      }

      // Turnovers (from box score stats)
      if (stats && stats.turnovers >= 3) {
        teachingMoments.push({
          type: "turnover",
          description: `#${jerseyNumber} - Ball security issue with ${stats.turnovers} turnovers. Focus on protecting the ball in traffic and making stronger passes.`,
        });
      }

      // Poor assist-to-turnover ratio
      if (stats && stats.assists < stats.turnovers) {
        teachingMoments.push({
          type: "decision_making",
          description: `#${jerseyNumber} - Decision-making could improve (${stats.assists} assists vs ${stats.turnovers} turnovers). Work on reading the defense before committing.`,
        });
      }

      // Insert teaching moments
      for (const moment of teachingMoments) {
        await db
          .insert(keyMoments)
          .values({
            detectedPlayerId: playerId,
            momentType: moment.type,
            sentiment: "negative",
            description: moment.description,
            timestampSeconds: null,
          })
          .onConflictDoNothing();
      }
    }
  }

  // Add all players to scouting review queue for admin review
  // This allows admins to verify/correct scouting observations
  for (const player of players) {
    const jerseyNumber = player.jerseyNumber || player.jersey;
    try {
      await addToScoutingReviewQueue(gameId, {
        team: player.team as "home" | "away",
        jerseyNumber: jerseyNumber,
        playerName: player.name || `#${jerseyNumber}`,
        scoutingData: {
          position: player.position,
          physicalProfile: player.physicalProfile,
          overallAssessment: player.overallAssessment,
          preferredHand: player.preferredHand,
          primaryMoves: player.primaryMoves,
          shootingAbility: player.shootingAbility,
          defensiveRating: player.defensiveRating,
          basketballIQ: player.basketballIQ,
          motor: player.motor,
          howToGuard: player.howToGuard,
          howToAttack: player.howToAttack,
        },
      });
    } catch (e) {
      console.error(
        `Failed to add player #${jerseyNumber} to scouting review queue:`,
        e,
      );
    }
  }

  console.log(`Stored multi-agent analysis for game ${gameId}:`, {
    players: players.length,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    scoutingReviewQueueAdded: players.length,
  });
}
