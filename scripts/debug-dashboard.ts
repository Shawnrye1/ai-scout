import { db } from '../lib/db/drizzle';
import { games, detectedPlayers, playerAnalysis, detectedTeams } from '../lib/db/schema';
import { eq, and, desc, inArray, isNotNull, sql } from 'drizzle-orm';

async function main() {
  const userId = 1;

  // Get game IDs for user
  const userGames = await db.select({ id: games.id }).from(games).where(eq(games.userId, userId));
  const gameIds = userGames.map(g => g.id);
  console.log('User game count:', gameIds.length);

  // Season Progression query (same as API)
  const gameGrades = await db
    .select({
      gameId: games.id,
      gameDate: games.createdAt,
      gameName: games.name,
      avgGrade: sql<number>`AVG(${playerAnalysis.overallGrade})::numeric(5,2)`,
    })
    .from(games)
    .innerJoin(detectedPlayers, eq(detectedPlayers.gameId, games.id))
    .innerJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
    .innerJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
    .where(
      and(
        eq(games.userId, userId),
        eq(detectedTeams.isUserTeam, true)
      )
    )
    .groupBy(games.id, games.createdAt, games.name)
    .orderBy(games.createdAt)
    .limit(10);

  console.log('Season Progression result:', JSON.stringify(gameGrades, null, 2));

  // Player Development query
  const playerGrades = await db
    .select({
      jerseyNumber: detectedPlayers.jerseyNumber,
      displayName: detectedPlayers.displayName,
      gameId: detectedPlayers.gameId,
      gameDate: games.createdAt,
      overallGrade: playerAnalysis.overallGrade,
    })
    .from(detectedPlayers)
    .innerJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
    .innerJoin(games, eq(games.id, detectedPlayers.gameId))
    .innerJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
    .where(
      and(
        inArray(detectedPlayers.gameId, gameIds),
        eq(detectedTeams.isUserTeam, true),
        isNotNull(playerAnalysis.overallGrade)
      )
    )
    .orderBy(desc(games.createdAt));

  console.log('\nPlayer grades count:', playerGrades.length);
  console.log('Sample player grades:', JSON.stringify(playerGrades.slice(0, 5), null, 2));

  // Group by jersey number
  const playerMap = new Map<string, any[]>();
  for (const pg of playerGrades) {
    const key = pg.jerseyNumber?.toString() || 'unknown';
    if (!playerMap.has(key)) playerMap.set(key, []);
    playerMap.get(key)!.push(pg);
  }

  console.log('\nPlayers with multiple games:');
  for (const [jersey, grades] of playerMap) {
    if (grades.length >= 2) {
      console.log(`  #${jersey}: ${grades.length} games, grades: ${grades.map(g => g.overallGrade).join(', ')}`);
    }
  }

  process.exit(0);
}
main().catch(console.error);
