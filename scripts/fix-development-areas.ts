import { client } from '../lib/db/drizzle';

async function fixDevelopmentAreas() {
  const gameId = '6dd0890f-75e1-40ec-8d03-08adaf5defc7';

  // Get all player analysis for this game
  const players = await client`
    SELECT
      pa.id,
      dp.jersey_number,
      dp.display_name,
      pa.development_areas
    FROM player_analysis pa
    JOIN detected_players dp ON pa.detected_player_id = dp.id
    WHERE dp.game_id = ${gameId}
  `;

  console.log('Removing generic "Develop Hand" suggestions...\n');

  for (const player of players) {
    const devAreas = player.development_areas as string[] | null;
    if (!devAreas || devAreas.length === 0) continue;

    // Filter out generic hand development suggestions
    const filteredAreas = devAreas.filter((area: string) => {
      const lower = area.toLowerCase();
      // Remove "Develop Left Hand", "Develop Right Hand", etc.
      if (lower.includes('left hand') || lower.includes('right hand')) {
        return false;
      }
      return true;
    });

    // Only update if we removed something
    if (filteredAreas.length !== devAreas.length) {
      await client`
        UPDATE player_analysis
        SET development_areas = ${JSON.stringify(filteredAreas)}::jsonb
        WHERE id = ${player.id}
      `;
      console.log(`#${player.jersey_number} ${player.display_name}:`);
      console.log(`  Before: ${JSON.stringify(devAreas)}`);
      console.log(`  After:  ${JSON.stringify(filteredAreas)}`);
      console.log();
    }
  }

  console.log('Done! Removed all generic hand development suggestions.');
}

fixDevelopmentAreas()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
