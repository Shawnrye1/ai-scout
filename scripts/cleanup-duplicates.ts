import { db } from '../lib/db/drizzle';
import { detectedPlayers, detectedTeams, playerAnalysis, keyMoments } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const gameId = 'c3bab412-5311-4417-b3a1-334245f3eb5e';

  // Get all teams for this game
  const teams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  console.log('Found', teams.length, 'teams');

  // Find teams that have properly named players (not just jersey numbers)
  const teamsToKeep: string[] = [];
  const teamsToDelete: string[] = [];

  for (const team of teams) {
    const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, team.id));

    // Check if any player has a real name (not just '#X' format)
    const hasRealNames = players.some(p => {
      if (!p.displayName) return false;
      // Real name if it doesn't match #number or #undefined
      return !/^#\d+$/.test(p.displayName) && !/^#undefined$/.test(p.displayName);
    });

    if (players.length > 0 && hasRealNames) {
      teamsToKeep.push(team.id);
      console.log('KEEP:', team.displayName || team.id, '- has', players.length, 'players with real names');
    } else {
      teamsToDelete.push(team.id);
      console.log('DELETE:', team.displayName || team.id, '- players:', players.length);
    }
  }

  // Delete the duplicate teams
  for (const teamId of teamsToDelete) {
    // Delete player analysis first
    const players = await db.select({ id: detectedPlayers.id }).from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, teamId));
    for (const p of players) {
      try {
        await db.delete(keyMoments).where(eq(keyMoments.playerId, p.id));
      } catch (e) {}
      try {
        await db.delete(playerAnalysis).where(eq(playerAnalysis.detectedPlayerId, p.id));
      } catch (e) {}
    }
    // Delete players
    await db.delete(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, teamId));
    // Delete team
    await db.delete(detectedTeams).where(eq(detectedTeams.id, teamId));
  }

  console.log('\nDeleted', teamsToDelete.length, 'duplicate teams');
  console.log('Kept', teamsToKeep.length, 'teams');

  // Now clean up duplicate players within kept teams (remove ones with #X format names)
  for (const teamId of teamsToKeep) {
    const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, teamId));

    const toDelete = players.filter(p => {
      if (!p.displayName) return true;
      return /^#\d+$/.test(p.displayName) || /^#undefined$/.test(p.displayName);
    });

    for (const p of toDelete) {
      try {
        await db.delete(keyMoments).where(eq(keyMoments.playerId, p.id));
      } catch (e) {}
      try {
        await db.delete(playerAnalysis).where(eq(playerAnalysis.detectedPlayerId, p.id));
      } catch (e) {}
      await db.delete(detectedPlayers).where(eq(detectedPlayers.id, p.id));
      console.log('Deleted duplicate player:', p.displayName, 'jersey', p.jerseyNumber);
    }
  }

  // Verify final count
  const finalTeams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  let totalPlayers = 0;
  for (const team of finalTeams) {
    const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, team.id));
    console.log(`\n${team.displayName}: ${players.length} players`);
    totalPlayers += players.length;
  }
  console.log(`\nTotal: ${finalTeams.length} teams, ${totalPlayers} players`);
}

main().catch(console.error);
