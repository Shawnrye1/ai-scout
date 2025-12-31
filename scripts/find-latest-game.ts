import { db } from '../lib/db/drizzle';
import { games, users } from '../lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  // Find the latest game for this user
  const userGames = await db
    .select({
      id: games.id,
      name: games.name,
      status: games.status,
      sport: games.sport,
      videoUrl: games.videoUrl,
      boxScore: games.boxScore,
      createdAt: games.createdAt,
    })
    .from(games)
    .innerJoin(users, eq(users.id, games.userId))
    .where(eq(users.email, 'shawnrearl@gmail.com'))
    .orderBy(desc(games.createdAt))
    .limit(1);

  if (userGames.length === 0) {
    console.log('No games found');
    return;
  }

  const game = userGames[0];
  console.log('Game ID:', game.id);
  console.log('Name:', game.name);
  console.log('Status:', game.status);
  console.log('Sport:', game.sport);
  console.log('Has boxScore:', game.boxScore ? 'YES' : 'NO');
  console.log('BoxScore preview:', game.boxScore?.substring(0, 200));
  console.log('Created:', game.createdAt);
}

main().catch(console.error);
