import { db } from "../lib/db/drizzle";
import { games, playerAnalysis, detectedPlayers } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function check() {
  // Both games
  const game1Id = "6dd0890f-75e1-40ec-8d03-08adaf5defc7"; // First (working)
  const game2Id = "700762a3-319a-43ee-88ee-f95c0c4445ce"; // Second (not working)

  console.log("=== GAME 1 (Working) ===");
  const game1Players = await db
    .select({
      id: detectedPlayers.id,
      jerseyNumber: detectedPlayers.jerseyNumber,
      metrics: playerAnalysis.metrics,
      overallGrade: playerAnalysis.overallGrade,
    })
    .from(detectedPlayers)
    .leftJoin(
      playerAnalysis,
      eq(detectedPlayers.id, playerAnalysis.detectedPlayerId),
    )
    .where(eq(detectedPlayers.gameId, game1Id))
    .limit(3);

  console.log("Sample players with metrics:");
  game1Players.forEach((p) => {
    console.log(
      `  #${p.jerseyNumber}: grade=${p.overallGrade}, metrics=${p.metrics ? "present" : "null"}`,
    );
  });

  if (game1Players[0]?.metrics) {
    console.log("\nGame 1 sample metrics structure:");
    console.log(JSON.stringify(game1Players[0].metrics, null, 2));
  }

  console.log("\n=== GAME 2 (Not Working) ===");
  const game2Players = await db
    .select({
      id: detectedPlayers.id,
      jerseyNumber: detectedPlayers.jerseyNumber,
      metrics: playerAnalysis.metrics,
      overallGrade: playerAnalysis.overallGrade,
    })
    .from(detectedPlayers)
    .leftJoin(
      playerAnalysis,
      eq(detectedPlayers.id, playerAnalysis.detectedPlayerId),
    )
    .where(eq(detectedPlayers.gameId, game2Id))
    .limit(3);

  console.log("Sample players with metrics:");
  game2Players.forEach((p) => {
    console.log(
      `  #${p.jerseyNumber}: grade=${p.overallGrade}, metrics=${p.metrics ? "present" : "null"}`,
    );
  });

  // Check box score data
  console.log("\n=== CHECKING BOX SCORE DATA ===");

  const [g1] = await db
    .select({ boxScore: games.boxScore, geminiAnalysis: games.geminiAnalysis })
    .from(games)
    .where(eq(games.id, game1Id));
  const [g2] = await db
    .select({ boxScore: games.boxScore, geminiAnalysis: games.geminiAnalysis })
    .from(games)
    .where(eq(games.id, game2Id));

  console.log(`Game 1 boxScore: ${g1.boxScore ? "present" : "null"}`);
  console.log(`Game 2 boxScore: ${g2.boxScore ? "present" : "null"}`);

  if (g1.boxScore) {
    console.log(
      "\nGame 1 box score sample:",
      JSON.stringify(g1.boxScore, null, 2).substring(0, 500),
    );
  }
  if (g2.boxScore) {
    console.log(
      "\nGame 2 box score:",
      JSON.stringify(g2.boxScore, null, 2).substring(0, 1000),
    );
  }

  // Also check if statTracker has data
  const analysis1 = g1.geminiAnalysis as any;
  const analysis2 = g2.geminiAnalysis as any;

  console.log("\n=== AGENT RESULTS ===");
  console.log(
    "Game 1 agentResults keys:",
    Object.keys(analysis1?.agentResults || {}),
  );
  console.log(
    "Game 2 agentResults keys:",
    Object.keys(analysis2?.agentResults || {}),
  );

  // Check statTracker in agent results
  if (analysis1?.agentResults?.statTracker) {
    console.log(
      "\nGame 1 statTracker events:",
      analysis1.agentResults.statTracker.events?.length || "no events",
    );
  }
  if (analysis2?.agentResults?.statTracker) {
    console.log(
      "Game 2 statTracker events:",
      analysis2.agentResults.statTracker.events?.length || "no events",
    );
  }

  process.exit(0);
}
check();
