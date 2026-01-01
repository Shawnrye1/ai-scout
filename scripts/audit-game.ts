import { db } from "../lib/db/drizzle";
import { games, playerAnalysis, detectedPlayers } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function audit() {
  const gameId = process.argv[2] || "700762a3-319a-43ee-88ee-f95c0c4445ce";

  // Get game info
  const [game] = await db
    .select({
      title: games.title,
      status: games.status,
      geminiAnalysis: games.geminiAnalysis,
    })
    .from(games)
    .where(eq(games.id, gameId));

  const analysis = game.geminiAnalysis as any;
  console.log("=== GAME AUDIT ===");
  console.log("Title:", game.title);
  console.log("Status:", game.status);
  console.log(
    "Teams:",
    analysis?.homeTeam || "?",
    "vs",
    analysis?.awayTeam || "?",
  );

  // Get all players with stats
  const players = await db
    .select({
      jersey: detectedPlayers.jerseyNumber,
      name: detectedPlayers.displayName,
      grade: playerAnalysis.overallGrade,
      metrics: playerAnalysis.metrics,
    })
    .from(detectedPlayers)
    .leftJoin(
      playerAnalysis,
      eq(detectedPlayers.id, playerAnalysis.detectedPlayerId),
    )
    .where(eq(detectedPlayers.gameId, gameId));

  console.log("\n=== PLAYERS (" + players.length + " total) ===\n");

  let withStats = 0;
  let withoutStats = 0;

  for (const p of players) {
    const m = p.metrics as any;
    if (m && m.points !== undefined) {
      withStats++;
      const ftPct =
        m.freeThrowsAttempted > 0
          ? Math.round((m.freeThrowsMade / m.freeThrowsAttempted) * 100)
          : 0;
      console.log(
        `#${p.jersey} ${p.name || "?"}: Grade ${p.grade} | ${m.points}pts ${m.rebounds}reb ${m.assists}ast | FG: ${m.fieldGoalsMade}-${m.fieldGoalsAttempted} | 3PT: ${m.threePointersMade}-${m.threePointersAttempted} | FT: ${m.freeThrowsMade}-${m.freeThrowsAttempted} (${ftPct}%)`,
      );
    } else {
      withoutStats++;
      console.log(
        `#${p.jersey} ${p.name || "?"}: Grade ${p.grade} | NO BOX SCORE`,
      );
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log("Players with complete stats:", withStats);
  console.log("Players without box score:", withoutStats);

  process.exit(0);
}

audit();
