import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  // Get most recent game
  const gameList = await db.select().from(games).orderBy(desc(games.createdAt)).limit(1);
  const game = gameList[0];

  if (!game) {
    console.log('No games found');
    return;
  }

  console.log('=== Game:', game.title, '===');
  console.log('ID:', game.id);
  console.log('\n=== Box Score (from game record) ===');
  console.log(game.boxScore || 'NOT SET');

  const analysis = game.geminiAnalysis as any;

  console.log('\n=== Team Scouting Data ===');
  console.log('Has homeTeam?', !!analysis?.teamScouting?.homeTeam);
  console.log('Has awayTeam?', !!analysis?.teamScouting?.awayTeam);
  console.log('Home offensive system:', analysis?.teamScouting?.homeTeam?.offensiveSystem);
  console.log('Away offensive system:', analysis?.teamScouting?.awayTeam?.offensiveSystem);
  console.log('Home defensive system:', analysis?.teamScouting?.homeTeam?.defensiveSystem);
  console.log('Away defensive system:', analysis?.teamScouting?.awayTeam?.defensiveSystem);

  console.log('\n=== Coaching Insights ===');
  console.log('Final score:', JSON.stringify(analysis?.coachingInsights?.finalScore, null, 2));
  console.log('Key moments count:', analysis?.coachingInsights?.keyMoments?.length || 0);
  console.log('Key moments sample:', JSON.stringify(analysis?.coachingInsights?.keyMoments?.slice(0, 2), null, 2));
  console.log('Scoring runs count:', analysis?.coachingInsights?.scoringRuns?.length || 0);
  console.log('Scoring runs sample:', JSON.stringify(analysis?.coachingInsights?.scoringRuns?.slice(0, 2), null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
