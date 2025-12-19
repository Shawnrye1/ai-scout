import { db } from '../lib/db/drizzle';
import { games, detectedTeams, detectedPlayers } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function fix() {
  // Update sport to basketball for all games
  const allGames = await db.select().from(games);
  for (const game of allGames) {
    await db.update(games).set({ sport: 'basketball' }).where(eq(games.id, game.id));
  }
  console.log('Updated sport to basketball');

  // Get teams
  const teams = await db.select().from(detectedTeams);

  // Build mapping: gameId -> { home: teamId, away: teamId }
  const gameTeams: Record<string, { home: string, away: string }> = {};
  for (const team of teams) {
    if (!gameTeams[team.gameId]) {
      gameTeams[team.gameId] = { home: '', away: '' };
    }
    if (team.isUserTeam) {
      gameTeams[team.gameId].home = team.id;
    } else {
      gameTeams[team.gameId].away = team.id;
    }
  }

  console.log('Game teams:', Object.keys(gameTeams).length, 'games');

  // Get all players
  const players = await db.select().from(detectedPlayers);
  console.log('Players to fix:', players.length);

  for (const player of players) {
    const teamMap = gameTeams[player.gameId];
    if (!teamMap) {
      console.log('No teams for game:', player.gameId);
      continue;
    }

    const jersey = parseInt(player.jerseyNumber || '0');
    // Home team jerseys: 12, 24, 88, 55
    const isHome = [12, 24, 88, 55, 33, 44].includes(jersey);
    const teamId = isHome ? teamMap.home : teamMap.away;

    if (teamId) {
      await db.update(detectedPlayers).set({ detectedTeamId: teamId }).where(eq(detectedPlayers.id, player.id));
      console.log('Linked #' + player.jerseyNumber, 'to', isHome ? 'home' : 'away');
    }
  }

  console.log('Done!');
}

fix().catch(console.error);
