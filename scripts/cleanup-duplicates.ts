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
      return !/^#\d+$/.test(p.displayName) && !/^#undefined$/.test(p.displayName);
    });

    if (players.length > 0 && hasRealNames) {
      teamsToKeep.push(team.id);
      console.log('KEEP:', team.teamName || team.id, '- has', players.length, 'players');
    } else {
      teamsToDelete.push(team.id);
      console.log('DELETE:', team.teamName || team.id, '- players:', players.length);
    }
  }

  // Delete empty teams
  for (const teamId of teamsToDelete) {
    const players = await db.select({ id: detectedPlayers.id }).from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, teamId));
    for (const p of players) {
      try { await db.delete(keyMoments).where(eq(keyMoments.playId, p.id)); } catch (e) {}
      try { await db.delete(playerAnalysis).where(eq(playerAnalysis.detectedPlayerId, p.id)); } catch (e) {}
    }
    await db.delete(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, teamId));
    await db.delete(detectedTeams).where(eq(detectedTeams.id, teamId));
  }

  console.log('\nDeleted', teamsToDelete.length, 'empty teams');

  // Now deduplicate players within each kept team (keep first occurrence of each jersey)
  for (const teamId of teamsToKeep) {
    const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, teamId));

    const seenJerseys = new Set<string>();
    const toDelete: string[] = [];

    for (const p of players) {
      const jersey = p.jerseyNumber || 'null';
      if (seenJerseys.has(jersey)) {
        // Duplicate jersey - mark for deletion
        toDelete.push(p.id);
        console.log('Duplicate:', p.displayName, 'jersey', p.jerseyNumber);
      } else {
        seenJerseys.add(jersey);
      }
    }

    // Also delete players with no displayName or #undefined
    for (const p of players) {
      if (!p.displayName || /^#\d+$/.test(p.displayName) || /^#undefined$/.test(p.displayName)) {
        if (!toDelete.includes(p.id)) {
          toDelete.push(p.id);
          console.log('Bad name:', p.displayName, 'jersey', p.jerseyNumber);
        }
      }
    }

    for (const playerId of toDelete) {
      try { await db.delete(keyMoments).where(eq(keyMoments.playId, playerId)); } catch (e) {}
      try { await db.delete(playerAnalysis).where(eq(playerAnalysis.detectedPlayerId, playerId)); } catch (e) {}
      await db.delete(detectedPlayers).where(eq(detectedPlayers.id, playerId));
    }

    if (toDelete.length > 0) {
      console.log('Deleted', toDelete.length, 'duplicate/invalid players from team');
    }
  }

  // Final count
  const finalTeams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  let totalPlayers = 0;
  for (const team of finalTeams) {
    const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, team.id));
    console.log(`\n${team.teamName}: ${players.length} players`);
    totalPlayers += players.length;
  }
  console.log(`\nTotal: ${finalTeams.length} teams, ${totalPlayers} players`);
}

main().catch(console.error);
