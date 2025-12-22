import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { detectedPlayers, detectedTeams, detectedPlays, games } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkData() {
  const gameId = process.argv[2] || "d8fdb36f-4b3f-49bc-9061-b525da2652d3";

  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  const teams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.gameId, gameId));
  const plays = await db.select().from(detectedPlays).where(eq(detectedPlays.gameId, gameId));

  console.log('=== Game Data ===');
  console.log('Game:', game?.name || 'Unknown');
  console.log('Status:', game?.status);
  console.log('Progress:', game?.processingProgress);
  console.log('');
  console.log('Teams:', teams.length);
  console.log('Players:', players.length);
  console.log('Plays:', plays.length);

  if (teams.length > 0) {
    console.log('\n=== Teams ===');
    teams.forEach(t => console.log(`  - ${t.teamName} (${t.playerCount} players)`));
  }

  if (players.length > 0) {
    console.log('\n=== Sample Players ===');
    players.slice(0, 5).forEach(p => console.log(`  - ${p.displayName} (Track ${p.trackingId})`));
  }
}

checkData().catch(console.error);
