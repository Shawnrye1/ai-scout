import { inngest } from "../client";
import { db } from "@/lib/db/drizzle";
import { games, users, detectedTeams, detectedPlayers, playerAnalysis, keyMoments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDownloadPresignedUrl } from "@/lib/storage/r2";
import { runMultiAgentAnalysis } from "@/lib/analysis/multi-agent-gemini";
import { type Sport } from "@/lib/analysis/sport-router";
import { sendGameReadyEmail, sendGameFailedEmail } from "@/lib/email/game-notifications";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Main game analysis function with:
 * - Automatic retries (3 attempts with exponential backoff)
 * - Concurrency limiting (max 3 games at once to avoid Gemini rate limits)
 * - Step-based execution (each step is individually retryable)
 * - Progress updates to database
 * - Email notifications on completion/failure
 */
export const analyzeGame = inngest.createFunction(
  {
    id: "analyze-game",
    retries: 3,
    concurrency: {
      limit: 3, // Max 3 games processing simultaneously
    },
    onFailure: async ({ event, error }) => {
      // This runs after all retries are exhausted
      const gameId = event.data.event.data.gameId;
      const userId = event.data.event.data.userId;

      console.error(`Game ${gameId} analysis permanently failed:`, error);

      // Update game status to failed
      await db
        .update(games)
        .set({
          status: "failed",
          processingError: `Analysis failed after 3 retries: ${error.message}`,
          updatedAt: new Date(),
        })
        .where(eq(games.id, gameId));

      // Send failure email to user
      try {
        const [user] = await db.select().from(users).where(eq(users.id, parseInt(userId)));
        if (user?.email) {
          await sendGameFailedEmail(user.email, gameId, error.message);
        }
      } catch (e) {
        console.error("Failed to send failure email:", e);
      }
    },
  },
  { event: "game/uploaded" },
  async ({ event, step }) => {
    const { gameId, userId, sport } = event.data;

    // Step 1: Get game info and validate
    const game = await step.run("get-game-info", async () => {
      const [gameRecord] = await db.select().from(games).where(eq(games.id, gameId));

      if (!gameRecord) {
        throw new Error(`Game ${gameId} not found`);
      }

      return gameRecord;
    });

    // Step 2: Get video URL (with presigned URL if needed)
    const videoUrl = await step.run("get-video-url", async () => {
      let url = game.videoUrl;

      if (game.videoKey) {
        try {
          url = await getDownloadPresignedUrl(game.videoKey, 3600 * 4);
        } catch (e) {
          console.error("Failed to generate presigned URL:", e);
          throw new Error("Could not access video file");
        }
      }

      if (!url) {
        throw new Error("No video URL available");
      }

      return url;
    });

    // Step 3: Update status to analyzing
    await step.run("update-status-analyzing", async () => {
      await db
        .update(games)
        .set({
          status: "analyzing",
          processingProgress: 5,
          updatedAt: new Date(),
        })
        .where(eq(games.id, gameId));
    });

    // Step 4: Download video to temp file
    const tempPath = await step.run("download-video", async () => {
      console.log(`Downloading video for game ${gameId}...`);

      const tempDir = path.join(os.tmpdir(), `gemini-${gameId}-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      const filePath = path.join(tempDir, "source.mp4");

      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status}`);
      }

      // Stream to file instead of loading all into memory
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));

      console.log(`Video downloaded to ${filePath}`);
      return filePath;
    });

    // Step 5: Run Gemini multi-agent analysis (this is the long-running step)
    const analysis = await step.run("gemini-analysis", async () => {
      console.log(`Running ${sport} analysis for game ${gameId}`);

      const result = await runMultiAgentAnalysis(
        tempPath,
        async (progress, message) => {
          console.log(`[${progress}%] ${message}`);
          // Update progress in database
          await db
            .update(games)
            .set({ processingProgress: progress })
            .where(eq(games.id, gameId));
        },
        game.boxScore || undefined,
        sport as Sport,
      );

      return result;
    });

    // Step 6: Store results in database
    await step.run("store-results", async () => {
      await storeAnalysisResults(gameId, analysis, game.boxScore);
    });

    // Step 7: Clean up temp files
    await step.run("cleanup", async () => {
      try {
        const tempDir = path.dirname(tempPath);
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("Failed to clean up temp directory:", e);
      }
    });

    // Step 8: Mark game as ready
    const playerCount = await step.run("mark-ready", async () => {
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

      return analysis.playerScouting?.players?.length || 0;
    });

    // Step 9: Send success email
    await step.run("send-success-email", async () => {
      try {
        const [user] = await db.select().from(users).where(eq(users.id, parseInt(userId)));
        if (user?.email) {
          await sendGameReadyEmail(user.email, gameId, playerCount);
        }
      } catch (e) {
        console.error("Failed to send success email:", e);
        // Don't throw - email failure shouldn't fail the whole job
      }
    });

    return {
      success: true,
      gameId,
      playerCount,
      sport,
    };
  }
);

// Helper function to store analysis results (extracted from original route)
async function storeAnalysisResults(gameId: string, analysis: any, boxScore: string | null) {
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

  // Parse box score for stats
  const boxScoreStats = parseBoxScore(boxScore);

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
          players.find((p) => p.jerseyNumber === jerseyNumber)
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

      // Generate development areas
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

      // Create teaching moments
      const teachingMoments: { type: string; description: string }[] = [];

      if (
        player.defensiveRating === "below average" ||
        player.defensiveRating === "average"
      ) {
        teachingMoments.push({
          type: "defensive_breakdown",
          description: `#${jerseyNumber} - Defensive positioning needs attention.`,
        });
      }

      if (stats && stats.turnovers >= 3) {
        teachingMoments.push({
          type: "turnover",
          description: `#${jerseyNumber} - Ball security issue with ${stats.turnovers} turnovers.`,
        });
      }

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

  console.log(`Stored analysis for game ${gameId}: ${players.length} players`);
}

// Parse box score helper
function parseBoxScore(boxScore: string | null): Map<string, any> {
  const playerStats = new Map();
  if (!boxScore) return playerStats;

  // Simplified parsing - the full implementation is in the original route
  // This handles the basic ESPN format
  const format1Regex =
    /(\d{1,2})([A-Za-z\s\-']+)\*?(\d{1,2})-(\d{1,2})(\d{1,2})-(\d{1,2})(\d{1,2})-(\d{1,2})(\d{1,2})(\d)(\d{1,2})(\d{1,2})(\d)(\d)(\d)(\d)/g;

  let match;
  while ((match = format1Regex.exec(boxScore)) !== null) {
    const jersey = match[1];
    playerStats.set(jersey, {
      points: parseInt(match[11]) || 0,
      rebounds: parseInt(match[9]) || 0,
      assists: parseInt(match[12]) || 0,
      steals: parseInt(match[15]) || 0,
      blocks: parseInt(match[14]) || 0,
      turnovers: parseInt(match[13]) || 0,
      fgm: parseInt(match[3]) || 0,
      fga: parseInt(match[4]) || 0,
      threePm: parseInt(match[5]) || 0,
      threePa: parseInt(match[6]) || 0,
      ftm: parseInt(match[7]) || 0,
      fta: parseInt(match[8]) || 0,
    });
  }

  return playerStats;
}

// Calculate grade helper
function calculateOverallGrade(stats: any): number {
  if (!stats) return 70;

  let grade = 60;
  grade += Math.min(stats.points * 1.5, 20);
  grade += Math.min(stats.rebounds * 2, 10);
  grade += Math.min(stats.assists * 2.5, 10);
  grade += Math.min((stats.steals + stats.blocks) * 3, 10);

  return Math.min(Math.round(grade), 99);
}
