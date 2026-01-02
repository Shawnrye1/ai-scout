import { db } from "../lib/db/drizzle";
import {
  games,
  playerAnalysis,
  detectedPlayers,
  detectedTeams,
} from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Parse box score to extract player stats (handles multiple formats)
 *
 * IMPORTANT: Keep this in sync with parseBoxScore in:
 * - /app/api/games/[id]/analyze-gemini/route.ts
 * - /lib/analysis/multi-agent-gemini.ts
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

  // Format 1: Compact format (no spaces) - older ESPN-style
  // Example: 01Robert Wright*5-121-43-4731412003214
  const format1Regex =
    /(\d{1,2})([A-Za-z\s\-']+)\*?(\d{1,2})-(\d{1,2})(\d{1,2})-(\d{1,2})(\d{1,2})-(\d{1,2})(\d{1,2})(\d)(\d{1,2})(\d{1,2})(\d)(\d)(\d)(\d)/g;

  while ((match = format1Regex.exec(boxScore)) !== null) {
    const jersey = match[1];
    const fgm = parseInt(match[3]) || 0;
    const fga = parseInt(match[4]) || 0;
    const threePm = parseInt(match[5]) || 0;
    const threePa = parseInt(match[6]) || 0;
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
      ftm: parseInt(match[7]) || 0,
      fta: parseInt(match[8]) || 0,
    });
  }

  if (playerStats.size > 0) {
    console.log(`Parsed ${playerStats.size} players from box score (format 1)`);
    return playerStats;
  }

  // For condensed format where all players are on one line, split by player pattern
  // Pattern: {jersey}{Name}{PTS}{FGM}-{FGA}{3PM}-{3PA}{FTM}-{FTA}{REB} ({O}-{D}){AST}{STL}{BLK}
  // Example: 32Cooper Flagg215-90-211-1214 (4-10)31430Liam McNeeley...

  // Find all player entries using regex that matches: jersey + name + stats ending with (x-y) + 3 digits
  // Name pattern handles: FirstName LastName, First McLastName, Name III
  const playerEntries = boxScore.match(
    /(\d{1,2})([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+[IVX]+)?)\d{1,2}\d-\d.*?\(\d+-\d+\)\d{1,3}/g,
  );

  if (playerEntries && playerEntries.length > 0) {
    console.log(`Found ${playerEntries.length} player entries`);

    for (const entry of playerEntries) {
      // Parse: {jersey}{Name}{PTS}{FGM}-{FGA}{3PM}-{3PA}{FTM}-{FTA}{REB} ({O}-{D}){AST}{STL}{BLK}
      const parts = entry.match(
        /^(\d{1,2})([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+[IVX]+)?)/,
      );
      if (!parts) continue;

      const jersey = parts[1];
      const name = parts[2];

      // Get rest after name: e.g., "215-90-211-1214 (4-10)314"
      const statsStr = entry.substring(jersey.length + name.length);

      // Parse the known pattern explicitly:
      // PTS FGM-FGA 3PM-3PA FTM-FTA REB (O-D) AST STL BLK
      // Example: 21 | 5-9 | 0-2 | 11-12 | 14 | (4-10) | 3 1 4
      // Concatenated: 215-90-211-1214 (4-10)314

      // Use a more explicit regex that captures each component
      // PTS(1-2d) FGM(1d)-FGA(1d) 3PM(1d)-3PA(1d) FTM(1-2d)-FTA(1-2d) REB(1-2d) (O-D) AST STL BLK
      const fullMatch = statsStr.match(
        /^(\d{1,2})(\d)-(\d)(\d)-(\d)(\d{1,2})-(\d{1,2})(\d{1,2})\s*\(\d+-\d+\)(\d{1,2})(\d)(\d)/,
      );

      if (!fullMatch) {
        console.log(`  Could not parse stats: ${statsStr}`);
        continue;
      }

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

      console.log(
        `  Parsed #${jersey} ${name}: ${pts}pts, ${fgm}-${fga}FG, ${threePm}-${threePa}3PT, ${ftm}-${fta}FT, ${reb}reb, ${ast}ast, ${stl}stl, ${blk}blk`,
      );

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

function calculateOverallGrade(
  stats: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
  } | null,
): number {
  if (!stats) return 70;
  let grade = 60;
  grade += Math.min(stats.points * 1.5, 20);
  grade += Math.min(stats.rebounds * 2, 10);
  grade += Math.min(stats.assists * 2.5, 10);
  grade += Math.min((stats.steals + stats.blocks) * 3, 10);
  return Math.min(Math.round(grade), 99);
}

async function reprocessGame(gameId: string, teamIdOverride?: string) {
  console.log(`\nReprocessing game ${gameId}...`);

  // Get box score
  const [game] = await db
    .select({ boxScore: games.boxScore })
    .from(games)
    .where(eq(games.id, gameId));
  if (!game?.boxScore) {
    console.log("No box score found for game");
    return;
  }

  console.log("Box score found, parsing...");
  const boxScoreStats = parseBoxScore(game.boxScore as string);
  console.log("Parsed stats:", Array.from(boxScoreStats.entries()));

  // Get the home team (or user's team) - box score applies only to this team
  let targetTeamId = teamIdOverride;
  if (!targetTeamId) {
    const teams = await db
      .select({
        id: detectedTeams.id,
        name: detectedTeams.teamName,
        isUserTeam: detectedTeams.isUserTeam,
      })
      .from(detectedTeams)
      .where(eq(detectedTeams.gameId, gameId));

    // Prefer user's team, otherwise take the first one
    const userTeam = teams.find((t) => t.isUserTeam);
    const firstTeam = teams[0];
    targetTeamId = userTeam?.id || firstTeam?.id;

    console.log(`Teams found: ${teams.map((t) => t.name).join(", ")}`);
    console.log(
      `Applying stats to: ${userTeam?.name || firstTeam?.name || "unknown"}`,
    );
  }

  if (!targetTeamId) {
    console.log("No team found for this game");
    return;
  }

  // Get only players from the target team (not all players!)
  const players = await db
    .select({
      id: detectedPlayers.id,
      jerseyNumber: detectedPlayers.jerseyNumber,
      analysisId: playerAnalysis.id,
      currentMetrics: playerAnalysis.metrics,
    })
    .from(detectedPlayers)
    .leftJoin(
      playerAnalysis,
      eq(detectedPlayers.id, playerAnalysis.detectedPlayerId),
    )
    .where(
      and(
        eq(detectedPlayers.gameId, gameId),
        eq(detectedPlayers.detectedTeamId, targetTeamId),
      ),
    );

  console.log(`Found ${players.length} players on target team`);

  let updated = 0;
  for (const player of players) {
    const jersey = String(player.jerseyNumber);
    const stats =
      boxScoreStats.get(jersey) || boxScoreStats.get(jersey.padStart(2, "0"));

    if (stats && player.analysisId) {
      console.log(
        `Updating #${jersey}: ${stats.points} pts, ${stats.rebounds} reb, ${stats.assists} ast`,
      );

      const newGrade = calculateOverallGrade(stats);

      await db
        .update(playerAnalysis)
        .set({
          metrics: {
            points: stats.points,
            rebounds: stats.rebounds,
            assists: stats.assists,
            steals: stats.steals,
            blocks: stats.blocks,
            turnovers: stats.turnovers,
            fieldGoalsMade: stats.fgm,
            fieldGoalsAttempted: stats.fga,
            threePointersMade: stats.threePm,
            threePointersAttempted: stats.threePa,
            fieldGoalPercentage:
              stats.fga > 0 ? Math.round((stats.fgm / stats.fga) * 100) : 0,
            threePointPercentage:
              stats.threePa > 0
                ? Math.round((stats.threePm / stats.threePa) * 100)
                : 0,
            freeThrowsMade: stats.ftm,
            freeThrowsAttempted: stats.fta,
            freeThrowPercentage:
              stats.fta > 0 ? Math.round((stats.ftm / stats.fta) * 100) : 0,
          },
          overallGrade: newGrade.toString(),
        })
        .where(eq(playerAnalysis.id, player.analysisId));

      updated++;
    } else if (!stats) {
      console.log(`No stats found for #${jersey}`);
    }
  }

  console.log(`\nUpdated ${updated} player records`);
}

async function main() {
  const gameId = process.argv[2];
  const teamId = process.argv[3]; // Optional: specify team ID to apply stats to

  if (!gameId) {
    console.log(
      "Usage: npx tsx scripts/reprocess-game-stats.ts <gameId> [teamId]",
    );
    console.log("  gameId: The game ID to reprocess");
    console.log(
      "  teamId: Optional. The team ID to apply stats to. If not provided, uses user's team or first team.",
    );
    process.exit(1);
  }

  await reprocessGame(gameId, teamId);
  process.exit(0);
}

main();
