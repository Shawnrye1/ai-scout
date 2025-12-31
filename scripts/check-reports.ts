import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const gameId = 'c3bab412-5311-4417-b3a1-334245f3eb5e';
  const [game] = await db.select({ geminiAnalysis: games.geminiAnalysis }).from(games).where(eq(games.id, gameId));
  const analysis = game?.geminiAnalysis as any;

  console.log('=== PLAYER SCOUTING DATA ===');
  console.log('Total players:', analysis?.playerScouting?.players?.length || 0);

  if (analysis?.playerScouting?.players) {
    for (const p of analysis.playerScouting.players.slice(0, 2)) {
      console.log('\n--- Player ---');
      console.log(JSON.stringify(p, null, 2).substring(0, 500));
    }
  }

  console.log('\n=== COACHING INSIGHTS ===');
  console.log('Has gameNarrative:', analysis?.coachingInsights?.gameNarrative ? 'YES' : 'NO');
}

main().catch(console.error);
