import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { desc } from 'drizzle-orm';

async function checkGameData() {
  const gameList = await db.select().from(games).orderBy(desc(games.createdAt)).limit(1);
  const game = gameList[0];

  if (game) {
    console.log('Video URL:', game.videoUrl?.slice(0, 100));
    console.log('\nGemini Analysis exists:', game.geminiAnalysis ? 'YES' : 'NO');

    if (game.geminiAnalysis) {
      const analysis = game.geminiAnalysis as any;
      console.log('\nCoaching Insights keys:', Object.keys(analysis.coachingInsights || {}));
      console.log('\nKey Moments count:', analysis.coachingInsights?.keyMoments?.length || 0);
      console.log('Key Moments sample:', JSON.stringify(analysis.coachingInsights?.keyMoments?.slice(0, 1), null, 2));
      console.log('\nScoring Runs count:', analysis.coachingInsights?.scoringRuns?.length || 0);
      console.log('Scoring Runs sample:', JSON.stringify(analysis.coachingInsights?.scoringRuns?.slice(0, 1), null, 2));
      console.log('\nGame Narrative:', analysis.coachingInsights?.gameNarrative?.slice(0, 300) || 'NONE');
      console.log('\nFinal Score:', JSON.stringify(analysis.coachingInsights?.finalScore));
    }
  } else {
    console.log('No games found');
  }
}

checkGameData().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
