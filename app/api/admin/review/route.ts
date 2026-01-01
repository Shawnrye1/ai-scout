import { NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import {
  games,
  detectedPlayers,
  detectedTeams,
  playerAnalysis,
} from "@/lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";

export async function GET() {
  try {
    // Get games with geminiAnalysis that has humanReviewQueue
    // We ONLY use geminiAnalysis as the source of truth (not detectedPlays)
    // to avoid duplicates
    const gamesWithReview = await db
      .select({
        id: games.id,
        name: games.name,
        title: games.title,
        createdAt: games.createdAt,
        videoUrl: games.videoUrl,
        geminiAnalysis: games.geminiAnalysis,
      })
      .from(games)
      .where(isNotNull(games.geminiAnalysis));

    // Transform into the format the UI expects
    const gamesData = await Promise.all(
      gamesWithReview.map(async (game) => {
        const analysis = game.geminiAnalysis as any;
        if (!analysis) return null;

        const humanReviewQueue = analysis.humanReviewQueue || [];

        // Calculate scores from player box scores (more accurate than detected events)
        let homeScore = 0;
        let awayScore = 0;

        // Get teams for this game
        const teams = await db
          .select({
            id: detectedTeams.id,
            isUserTeam: detectedTeams.isUserTeam,
          })
          .from(detectedTeams)
          .where(eq(detectedTeams.gameId, game.id));

        // Get player stats and sum points by team
        for (const team of teams) {
          const players = await db
            .select({ metrics: playerAnalysis.metrics })
            .from(detectedPlayers)
            .leftJoin(
              playerAnalysis,
              eq(detectedPlayers.id, playerAnalysis.detectedPlayerId),
            )
            .where(eq(detectedPlayers.detectedTeamId, team.id));

          let teamPoints = 0;
          for (const p of players) {
            const m = p.metrics as any;
            if (m?.points) teamPoints += m.points;
          }

          if (team.isUserTeam) {
            homeScore = teamPoints;
          } else {
            awayScore = teamPoints;
          }
        }

        const officialBoxScore = analysis.officialBoxScore;
        const scoreDiscrepancy = analysis.scoreDiscrepancy;

        if (humanReviewQueue.length === 0 && !scoreDiscrepancy) return null;

        // Use title (which has team names) or fall back to name
        const gameName = game.title || game.name || "Untitled Game";
        // Format date for display
        const gameDate = game.createdAt
          ? new Date(game.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "";

        return {
          id: game.id,
          name: gameName,
          date: gameDate,
          videoUrl: game.videoUrl,
          homeScore,
          awayScore,
          officialBoxScore,
          scoreDiscrepancy,
          reviewCount: humanReviewQueue.length,
          events: humanReviewQueue.map((event: any, idx: number) => ({
            id: `${game.id}-${idx}`,
            gameId: game.id,
            gameName: gameName,
            timestamp: event.timestamp,
            timestampSeconds: event.timestampSeconds,
            type: event.type,
            team: event.team,
            jersey: event.jersey,
            confidence: event.confidence,
            reason: event.reason,
            specialistConfidence: event.specialistConfidence,
            // Scoring event fields
            points: event.points,
            shotType: event.shotType,
          })),
        };
      }),
    );

    return NextResponse.json({ games: gamesData.filter(Boolean) });
  } catch (error) {
    console.error("Error fetching review queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch review queue" },
      { status: 500 },
    );
  }
}
