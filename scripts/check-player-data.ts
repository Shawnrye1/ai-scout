import { db } from '../lib/db/drizzle';
import { games, detectedPlayers, playerAnalysis } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const gameId = 'c3bab412-5311-4417-b3a1-334245f3eb5e';

  // Check geminiAnalysis for player reports
  const [game] = await db.select({ geminiAnalysis: games.geminiAnalysis }).from(games).where(eq(games.id, gameId));
  const analysis = game?.geminiAnalysis as any;

  console.log('Has playerScouting:', analysis?.playerScouting ? 'YES' : 'NO');
  console.log('Players in playerScouting:', analysis?.playerScouting?.players?.length || 0);

  if (analysis?.playerScouting?.players?.length > 0) {
    const firstPlayer = analysis.playerScouting.players[0];
    console.log('\nFirst player sample:');
    console.log('  jersey:', firstPlayer.jersey);
    console.log('  team:', firstPlayer.team);
    console.log('  has report:', firstPlayer.report ? 'YES' : 'NO');
  }

  // Check playerAnalysis table
  const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.gameId, gameId));
  console.log('\nDetected players in DB:', players.length);

  for (const p of players.slice(0, 3)) {
    const [pa] = await db.select().from(playerAnalysis).where(eq(playerAnalysis.detectedPlayerId, p.id));
    console.log(p.displayName, '- has analysis:', pa ? 'YES' : 'NO', '- has fullReport:', pa?.fullReport ? 'YES' : 'NO');
  }
}

main().catch(console.error);
