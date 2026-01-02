import { NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import { scoutingReviewQueue, games, detectedPlayers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getScoutingFewShotStats } from "@/lib/analysis/scouting-few-shot";

/**
 * GET /api/admin/scouting-review
 *
 * Get all pending scouting reviews grouped by game
 */
export async function GET() {
  try {
    // Get all pending reviews with game info
    const pendingReviews = await db
      .select({
        id: scoutingReviewQueue.id,
        gameId: scoutingReviewQueue.gameId,
        gameName: games.title,
        gameDate: games.createdAt,
        videoUrl: games.videoUrl,
        team: scoutingReviewQueue.team,
        jerseyNumber: scoutingReviewQueue.jerseyNumber,
        playerName: scoutingReviewQueue.playerName,
        scoutingData: scoutingReviewQueue.scoutingData,
        status: scoutingReviewQueue.status,
        createdAt: scoutingReviewQueue.createdAt,
      })
      .from(scoutingReviewQueue)
      .leftJoin(games, eq(scoutingReviewQueue.gameId, games.id))
      .where(eq(scoutingReviewQueue.status, "pending"))
      .orderBy(desc(scoutingReviewQueue.createdAt));

    // Group by game
    const gamesMap = new Map<
      string,
      {
        id: string;
        name: string;
        date: string;
        videoUrl: string | null;
        players: any[];
      }
    >();

    for (const review of pendingReviews) {
      if (!gamesMap.has(review.gameId)) {
        gamesMap.set(review.gameId, {
          id: review.gameId,
          name: review.gameName || "Untitled Game",
          date: review.gameDate
            ? new Date(review.gameDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "",
          videoUrl: review.videoUrl,
          players: [],
        });
      }

      gamesMap.get(review.gameId)!.players.push({
        reviewId: review.id,
        team: review.team,
        jerseyNumber: review.jerseyNumber,
        playerName: review.playerName,
        scoutingData: review.scoutingData,
      });
    }

    // Get few-shot stats
    const fewShotStats = await getScoutingFewShotStats();

    return NextResponse.json({
      games: Array.from(gamesMap.values()),
      totalPendingPlayers: pendingReviews.length,
      fewShotStats: {
        totalExamples: fewShotStats.totalExamples,
        totalCorrections: fewShotStats.totalCorrections,
        byObservationType: fewShotStats.byObservationType,
      },
    });
  } catch (error) {
    console.error("Error fetching scouting reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch scouting reviews" },
      { status: 500 },
    );
  }
}
