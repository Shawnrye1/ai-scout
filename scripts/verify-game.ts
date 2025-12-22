import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { games, detectedTeams, detectedPlayers, detectedPlays, playerAnalysis, teamAnalysis } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function verify() {
  const gameId = '7d7ecb07-3557-4c13-9968-f0b951fa434c';

  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  console.log('=== GAME STATUS ===');
  console.log('Status:', game?.status);
  console.log('Duration:', game?.videoDurationSeconds, 'seconds');
  console.log('Sport:', game?.sport);

  const teams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  console.log('\n=== TEAMS ===');
  console.log('Teams detected:', teams.length);
  for (const team of teams) {
    console.log('  -', team.teamName, '| Players:', team.playerCount, '| Color:', team.primaryJerseyColor);

    const [analysis] = await db.select().from(teamAnalysis).where(eq(teamAnalysis.detectedTeamId, team.id));
    if (analysis) {
      console.log('    Has team analysis: YES');
      if (analysis.tendenciesReport) {
        console.log('    Report preview:', String(analysis.tendenciesReport).slice(0, 100) + '...');
      }
    }
  }

  const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.gameId, gameId));
  console.log('\n=== PLAYERS ===');
  console.log('Players detected:', players.length);

  let playersWithAnalysis = 0;
  for (const player of players.slice(0, 5)) {
    const [pa] = await db.select().from(playerAnalysis).where(eq(playerAnalysis.detectedPlayerId, player.id));
    if (pa) {
      playersWithAnalysis++;
      console.log('  -', player.displayName, '| Grade:', pa.overallGrade);
    } else {
      console.log('  -', player.displayName, '| No analysis');
    }
  }

  const plays = await db.select().from(detectedPlays).where(eq(detectedPlays.gameId, gameId));
  console.log('\n=== PLAYS ===');
  console.log('Plays detected:', plays.length);

  console.log('\n=== READY TO VIEW ===');
  console.log('View game at: /game/' + gameId);

  process.exit(0);
}

verify();
