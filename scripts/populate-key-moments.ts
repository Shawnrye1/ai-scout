import { db } from '../lib/db/drizzle';
import { games, detectedPlayers, playerAnalysis, keyMoments } from '../lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Populate key_moments table from player analysis data
 * Creates teaching moments (negative sentiment) based on player weaknesses
 */
async function main() {
  const gameId = '6dd0890f-75e1-40ec-8d03-08adaf5defc7';

  // Get game with analysis
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) {
    console.log('Game not found');
    return;
  }

  // Get all players for this game with their analysis
  const players = await db
    .select({
      id: detectedPlayers.id,
      jerseyNumber: detectedPlayers.jerseyNumber,
      displayName: detectedPlayers.displayName,
      tendencies: playerAnalysis.tendencies,
      metrics: playerAnalysis.metrics,
    })
    .from(detectedPlayers)
    .leftJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
    .where(eq(detectedPlayers.gameId, gameId));

  console.log('Found', players.length, 'players');

  let momentsCreated = 0;

  for (const player of players) {
    const tendencies = player.tendencies as any;
    const metrics = player.metrics as any;

    // Create teaching moments based on weaknesses
    const teachingMoments: { type: string; description: string }[] = [];

    // Defensive rating
    if (tendencies?.defensiveRating === 'below average' || tendencies?.defensiveRating === 'average') {
      teachingMoments.push({
        type: 'defensive_breakdown',
        description: `#${player.jerseyNumber} - Defensive positioning and awareness needs attention. Work on help defense rotations and staying in front of the ball.`,
      });
    }

    // Turnovers
    if (metrics?.turnovers && metrics.turnovers >= 3) {
      teachingMoments.push({
        type: 'turnover',
        description: `#${player.jerseyNumber} - Ball security issue with ${metrics.turnovers} turnovers. Focus on protecting the ball in traffic and making stronger passes.`,
      });
    }

    // Low assist-to-turnover ratio for guards
    if (metrics?.assists && metrics?.turnovers && metrics.assists < metrics.turnovers) {
      teachingMoments.push({
        type: 'decision_making',
        description: `#${player.jerseyNumber} - Decision-making could improve (${metrics.assists} assists vs ${metrics.turnovers} turnovers). Work on reading the defense before committing.`,
      });
    }

    // Insert teaching moments
    for (const moment of teachingMoments) {
      try {
        await db.insert(keyMoments).values({
          detectedPlayerId: player.id,
          momentType: moment.type,
          sentiment: 'negative',
          description: moment.description,
          timestampSeconds: null, // No specific timestamp for generated moments
        });
        momentsCreated++;
        console.log(`  Created: ${moment.type} for #${player.jerseyNumber}`);
      } catch (e) {
        console.log(`  Skipped (may already exist): ${moment.type} for #${player.jerseyNumber}`);
      }
    }
  }

  console.log('\nCreated', momentsCreated, 'teaching moments for Film Session');
}

main().catch(console.error);
