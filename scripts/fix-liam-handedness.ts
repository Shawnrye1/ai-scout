import { client } from '../lib/db/drizzle';

async function fixLiamMcNeeley() {
  const gameId = '6dd0890f-75e1-40ec-8d03-08adaf5defc7';
  const montverdeTeamId = '054ea06a-c714-4234-995c-3324da6efca3';

  // Get current tendencies
  const current = await client`
    SELECT pa.id, pa.tendencies, pa.development_areas
    FROM player_analysis pa
    JOIN detected_players dp ON pa.detected_player_id = dp.id
    WHERE dp.game_id = ${gameId}
      AND dp.detected_team_id = ${montverdeTeamId}
      AND dp.jersey_number = '30'
  `;

  if (current.length === 0) {
    console.log('Player not found');
    return;
  }

  const analysisId = current[0].id;
  const oldTendencies = current[0].tendencies as any;
  const oldDevAreas = current[0].development_areas as any;

  console.log('Before:');
  console.log('  Tendencies:', JSON.stringify(oldTendencies));
  console.log('  Development Areas:', JSON.stringify(oldDevAreas));

  // Update tendencies - change preferredHand to left
  const newTendencies = {
    ...oldTendencies,
    preferredHand: 'left'
  };

  // Update development areas - remove 'Develop Left Hand' since he IS left-handed
  const newDevAreas = (oldDevAreas || []).filter((area: string) => {
    const lower = area.toLowerCase();
    return lower.indexOf('left hand') === -1;
  });

  await client`
    UPDATE player_analysis
    SET tendencies = ${JSON.stringify(newTendencies)}::jsonb,
        development_areas = ${JSON.stringify(newDevAreas)}::jsonb
    WHERE id = ${analysisId}
  `;

  console.log('\nAfter:');
  console.log('  Tendencies:', JSON.stringify(newTendencies));
  console.log('  Development Areas:', JSON.stringify(newDevAreas));
  console.log('\nLiam McNeeley updated to left-handed!');
}

fixLiamMcNeeley()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
