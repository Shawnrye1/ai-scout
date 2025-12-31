import { db } from '../lib/db/drizzle';
import { games, detectedPlayers, detectedTeams, playerAnalysis, keyMoments, detectedPlays, users, teamAnalysis } from '../lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function main() {
  const email = 'shawnrearl@gmail.com';

  // Find user by email
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    console.log('User not found');
    return;
  }
  console.log('Found user:', user.email);

  // Get all games for this user
  const userGames = await db.select({ id: games.id, name: games.name }).from(games).where(eq(games.userId, user.id));
  console.log('Found', userGames.length, 'games');

  for (const g of userGames) {
    console.log('  -', g.name || 'Untitled');
  }

  if (userGames.length === 0) {
    console.log('No games to delete');
    return;
  }

  const gameIds = userGames.map(g => g.id);

  // Get all detected players for these games
  const players = await db.select({ id: detectedPlayers.id }).from(detectedPlayers).where(inArray(detectedPlayers.gameId, gameIds));
  const playerIds = players.map(p => p.id);
  console.log('Found', playerIds.length, 'players to delete');

  // Get all detected teams for these games
  const teamsToDelete = await db.select({ id: detectedTeams.id }).from(detectedTeams).where(inArray(detectedTeams.gameId, gameIds));
  const teamIds = teamsToDelete.map(t => t.id);
  console.log('Found', teamIds.length, 'teams to delete');

  // Delete in order (respect foreign keys)
  if (playerIds.length > 0) {
    // Key moments
    await db.delete(keyMoments).where(inArray(keyMoments.detectedPlayerId, playerIds));
    console.log('Deleted key moments');

    // Player analysis
    await db.delete(playerAnalysis).where(inArray(playerAnalysis.detectedPlayerId, playerIds));
    console.log('Deleted player analysis');
  }

  // Team analysis
  if (teamIds.length > 0) {
    await db.delete(teamAnalysis).where(inArray(teamAnalysis.detectedTeamId, teamIds));
    console.log('Deleted team analysis');
  }

  // Detected plays
  await db.delete(detectedPlays).where(inArray(detectedPlays.gameId, gameIds));
  console.log('Deleted detected plays');

  // Detected players
  await db.delete(detectedPlayers).where(inArray(detectedPlayers.gameId, gameIds));
  console.log('Deleted detected players');

  // Detected teams
  await db.delete(detectedTeams).where(inArray(detectedTeams.gameId, gameIds));
  console.log('Deleted detected teams');

  // Games
  await db.delete(games).where(eq(games.userId, user.id));
  console.log('Deleted games');

  console.log('\nCleared all game data for', user.email);
  console.log('User account preserved - like a fresh signup!');
}

main().catch(console.error);
