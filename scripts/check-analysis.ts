import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const gameId = 'c3bab412-5311-4417-b3a1-334245f3eb5e';

  const [game] = await db.select({
    geminiAnalysis: games.geminiAnalysis
  }).from(games).where(eq(games.id, gameId));

  const analysis = game?.geminiAnalysis as any;

  if (!analysis) {
    console.log('No geminiAnalysis found!');
    return;
  }

  console.log('Keys in geminiAnalysis:', Object.keys(analysis));
  console.log('\nteamScouting:', analysis.teamScouting ? 'present' : 'missing');
  console.log('playerScouting:', analysis.playerScouting ? 'present' : 'missing');
  console.log('coachingInsights:', analysis.coachingInsights ? 'present' : 'missing');
  console.log('humanReviewQueue length:', analysis.humanReviewQueue?.length || 0);
  console.log('detectedEvents length:', analysis.detectedEvents?.length || 0);

  // Show some content
  if (analysis.teamScouting?.homeTeam) {
    console.log('\nHome team scouting:', JSON.stringify(analysis.teamScouting.homeTeam).substring(0, 200) + '...');
  }
}

main().catch(console.error);
