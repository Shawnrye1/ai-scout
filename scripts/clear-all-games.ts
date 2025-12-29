/**
 * Clear All Games and Start Fresh
 *
 * This script clears all games, detected data, and analysis
 * to start fresh with the new multi-agent pipeline.
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import {
  games,
  detectedTeams,
  detectedPlayers,
  detectedPlays,
  playerAnalysis,
  teamAnalysis,
  keyMoments,
  corrections,
  playerPlayInvolvement,
} from '../lib/db/schema';
import { sql } from 'drizzle-orm';

async function clearAllGames() {
  console.log('='.repeat(60));
  console.log('CLEARING ALL GAMES AND DATA');
  console.log('='.repeat(60));
  console.log('');

  // Get current counts
  const gameCount = await db.select({ count: sql<number>`count(*)` }).from(games);
  const teamCount = await db.select({ count: sql<number>`count(*)` }).from(detectedTeams);
  const playerCount = await db.select({ count: sql<number>`count(*)` }).from(detectedPlayers);
  const playCount = await db.select({ count: sql<number>`count(*)` }).from(detectedPlays);

  console.log('Current data:');
  console.log(`  Games: ${gameCount[0]?.count || 0}`);
  console.log(`  Teams: ${teamCount[0]?.count || 0}`);
  console.log(`  Players: ${playerCount[0]?.count || 0}`);
  console.log(`  Plays: ${playCount[0]?.count || 0}`);
  console.log('');

  // Confirm deletion
  console.log('This will DELETE ALL data. Proceeding in 3 seconds...');
  await new Promise(r => setTimeout(r, 3000));

  // Delete in order (respecting foreign keys)
  // detected_plays references detected_teams via possession_team_id
  // So we need to delete plays BEFORE teams

  console.log('Deleting corrections...');
  await db.delete(corrections);

  console.log('Deleting player play involvement...');
  await db.delete(playerPlayInvolvement);

  console.log('Deleting key moments...');
  await db.delete(keyMoments);

  console.log('Deleting player analysis...');
  await db.delete(playerAnalysis);

  console.log('Deleting team analysis...');
  await db.delete(teamAnalysis);

  console.log('Deleting detected plays...');
  await db.delete(detectedPlays);

  console.log('Deleting detected players...');
  await db.delete(detectedPlayers);

  console.log('Deleting detected teams...');
  await db.delete(detectedTeams);

  console.log('Deleting games...');
  await db.delete(games);

  console.log('');
  console.log('='.repeat(60));
  console.log('ALL DATA CLEARED');
  console.log('='.repeat(60));
  console.log('');
  console.log('Ready to start fresh with new pipeline!');
}

clearAllGames()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
