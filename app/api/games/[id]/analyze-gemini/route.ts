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
import { type Sport } from "@/lib/analysis/sport-router";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

// Parse box score to extract player stats (handles multiple formats)
function parseBoxScore(
  boxScore: string | null,
): Map<
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

  // Format 1: Compact ESPN-style format (no spaces between stats)
  // Example: 01Robert Wright*5-121-43-4731412003214
  // Pattern: #{jersey}{name}*{FGM}-{FGA}{3PM}-{3PA}{FTM}-{FTA}{REB}{PF}{PTS}{AST}{TO}{BLK}{STL}{MIN}
  const format1Regex =
    /(\d{1,2})([A-Za-z\s\-']+)\*?(\d{1,2})-(\d{1,2})(\d{1,2})-(\d{1,2})(\d{1,2})-(\d{1,2})(\d{1,2})(\d)(\d{1,2})(\d{1,2})(\d)(\d)(\d)(\d)/g;

  let match;
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
  const boxScoreStats = parseBoxScore(gameRecord?.boxScore || null);

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
      // Get stats from box score
      const stats =
        boxScoreStats.get(String(jerseyNumber)) ||
        boxScoreStats.get(jerseyNumber?.toString().padStart(2, "0")) ||
        null;
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

  console.log(`Stored multi-agent analysis for game ${gameId}:`, {
    players: players.length,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
  });
}
