/**
 * Populate Scouting Review Queue from Existing Games
 *
 * This script extracts player scouting data from existing game analyses
 * and adds them to the scouting review queue for admin review.
 *
 * Usage: POSTGRES_URL=xxx npx tsx scripts/populate-scouting-queue.ts
 */

import { db } from "../lib/db/drizzle";
import { games, scoutingReviewQueue } from "../lib/db/schema";
import { isNotNull, eq } from "drizzle-orm";

async function populateScoutingQueue() {
  console.log("Fetching games with Gemini analysis...");

  // Get all games with player scouting data
  const gamesWithAnalysis = await db
    .select({
      id: games.id,
      title: games.title,
      geminiAnalysis: games.geminiAnalysis,
    })
    .from(games)
    .where(isNotNull(games.geminiAnalysis));

  console.log(`Found ${gamesWithAnalysis.length} games with analysis`);

  let totalPlayersAdded = 0;

  for (const game of gamesWithAnalysis) {
    const analysis = game.geminiAnalysis as any;
    if (!analysis?.playerScouting?.players) {
      console.log(`  Game ${game.title || game.id}: No player scouting data`);
      continue;
    }

    const players = analysis.playerScouting.players;
    console.log(`  Game ${game.title || game.id}: ${players.length} players`);

    // Check if players already in queue for this game
    const existingReviews = await db
      .select({ id: scoutingReviewQueue.id })
      .from(scoutingReviewQueue)
      .where(eq(scoutingReviewQueue.gameId, game.id));

    if (existingReviews.length > 0) {
      console.log(
        `    - Already has ${existingReviews.length} reviews in queue, skipping`,
      );
      continue;
    }

    // Add each player to the queue
    for (const player of players) {
      const jerseyNumber = player.jerseyNumber || player.jersey;
      try {
        await db.insert(scoutingReviewQueue).values({
          gameId: game.id,
          team: player.team || "home",
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
          status: "pending",
        });
        totalPlayersAdded++;
      } catch (e) {
        console.error(`    - Failed to add player #${jerseyNumber}:`, e);
      }
    }
  }

  console.log(
    `\nDone! Added ${totalPlayersAdded} players to scouting review queue.`,
  );
  console.log("Visit /admin/review to start reviewing.");
}

populateScoutingQueue()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
