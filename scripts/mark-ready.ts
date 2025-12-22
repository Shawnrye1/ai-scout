import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function markReady() {
  const gameId = process.argv[2] || "d8fdb36f-4b3f-49bc-9061-b525da2652d3";

  await db.update(games)
    .set({
      status: 'ready',
      processingProgress: 100,
      updatedAt: new Date(),
    })
    .where(eq(games.id, gameId));

  console.log(`Game ${gameId} marked as ready`);
}

markReady().catch(console.error);
