import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function check() {
  const game = await db.query.games.findFirst({
    where: eq(games.id, "7d7ecb07-3557-4c13-9968-f0b951fa434c")
  });

  console.log("Status:", game?.status);
  console.log("Progress:", game?.processingProgress);
  console.log("Error:", game?.processingError);
}

check().catch(console.error);
