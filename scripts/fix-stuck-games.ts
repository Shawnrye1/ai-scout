import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { games, detectedTeams, detectedPlayers, detectedPlays } from '../lib/db/schema';
import { eq, ne, and, or } from 'drizzle-orm';

async function fixStuckGames() {
  console.log('Finding stuck games...\n');

  // Find games that aren't ready or failed
  const stuckGames = await db
    .select()
    .from(games)
    .where(
      and(
        ne(games.status, 'ready'),
        ne(games.status, 'failed')
      )
    );

  if (stuckGames.length === 0) {
    console.log('No stuck games found!');
    process.exit(0);
  }

  console.log(`Found ${stuckGames.length} stuck game(s):\n`);

  for (const game of stuckGames) {
    console.log(`Game: ${game.name || game.id}`);
    console.log(`  Status: ${game.status}`);
    console.log(`  Progress: ${game.processingProgress}%`);
    console.log(`  Sport: ${game.sport || 'not detected'}`);
    if (game.processingError) {
      console.log(`  Error: ${game.processingError}`);
    }

    // Check what data exists
    const teams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, game.id));
    const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.gameId, game.id));
    const plays = await db.select().from(detectedPlays).where(eq(detectedPlays.gameId, game.id));

    console.log(`  Data: ${teams.length} teams, ${players.length} players, ${plays.length} plays`);

    // If we have substantial data, mark as ready
    if (teams.length > 0 && players.length > 0) {
      console.log(`  -> Marking as READY (has data)`);
      await db
        .update(games)
        .set({
          status: 'ready',
          processingProgress: 100,
          processingError: null
        })
        .where(eq(games.id, game.id));
      console.log(`  -> Fixed!`);
    } else if (game.processingProgress && game.processingProgress > 50) {
      // Progress is high but no data - mark as failed
      console.log(`  -> Marking as FAILED (no data despite ${game.processingProgress}% progress)`);
      await db
        .update(games)
        .set({
          status: 'failed',
          processingError: 'Processing stalled - no data received'
        })
        .where(eq(games.id, game.id));
    } else {
      console.log(`  -> Leaving as-is (may still be processing)`);
    }

    console.log('');
  }

  console.log('Done!');
  process.exit(0);
}

fixStuckGames().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
