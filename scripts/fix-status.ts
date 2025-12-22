import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { games, detectedTeams, teamAnalysis } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function fix() {
  const gameId = '7d7ecb07-3557-4c13-9968-f0b951fa434c';

  // Check game
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  console.log('DB Game Status:', game?.status);
  console.log('DB Progress:', game?.processingProgress);

  // Check teams
  const teams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  console.log('Teams in DB:', teams.length);

  // Manually update status if teams exist but status is wrong
  if (teams.length > 0 && game?.status === 'queued') {
    console.log('\nFixing status...');
    await db.update(games).set({ status: 'ready', processingProgress: 100 }).where(eq(games.id, gameId));
    console.log('Status fixed to ready');
  }

  // Now verify the team analysis
  for (const team of teams) {
    const [ta] = await db.select().from(teamAnalysis).where(eq(teamAnalysis.detectedTeamId, team.id));
    console.log('\nTeam:', team.teamName);
    console.log('  Has Analysis:', ta ? 'YES' : 'NO');
    if (ta?.tendencies) {
      const t = ta.tendencies as any;
      console.log('  Strengths:', t.strengths?.length || 0);
      console.log('  Weaknesses:', t.weaknesses?.length || 0);
      console.log('  Overall Grade:', t.overallGrade || 'none');
    }
    if (ta?.tendenciesReport) {
      console.log('  Report:', String(ta.tendenciesReport).slice(0, 80) + '...');
    }
  }

  process.exit(0);
}

fix();
