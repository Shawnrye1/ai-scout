import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkGame() {
  const gameId = process.argv[2] || "d8fdb36f-4b3f-49bc-9061-b525da2652d3";

  const [game] = await db.select({
    id: games.id,
    name: games.name,
    status: games.status,
    progress: games.processingProgress,
    error: games.processingError,
  }).from(games).where(eq(games.id, gameId));

  if (game) {
    console.log('Game:', game.name);
    console.log('Status:', game.status);
    console.log('Progress:', game.progress + '%');
    if (game.error) console.log('Error:', game.error);
  } else {
    console.log('Game not found:', gameId);
  }
}

checkGame().catch(console.error);
