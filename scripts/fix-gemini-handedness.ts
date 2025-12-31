import { client } from '../lib/db/drizzle';

async function fixGeminiHandedness() {
  const gameId = '6dd0890f-75e1-40ec-8d03-08adaf5defc7';

  // Get current gemini_analysis
  const result = await client`
    SELECT gemini_analysis
    FROM games
    WHERE id = ${gameId}
  `;

  const analysis = result[0]?.gemini_analysis as any;
  if (!analysis) {
    console.log('No gemini_analysis found');
    return;
  }

  // Update Liam McNeeley's preferredHand in playerScouting
  const playerScouting = analysis.playerScouting;
  if (Array.isArray(playerScouting)) {
    for (const player of playerScouting) {
      if (player.jerseyNumber === 30 || player.jerseyNumber === '30') {
        console.log(`Before: #${player.jerseyNumber} ${player.name} - preferredHand: ${player.preferredHand}`);
        player.preferredHand = 'left';
        console.log(`After:  #${player.jerseyNumber} ${player.name} - preferredHand: ${player.preferredHand}`);
      }
    }
  } else if (playerScouting?.players) {
    for (const player of playerScouting.players) {
      if (player.jerseyNumber === 30 || player.jerseyNumber === '30') {
        console.log(`Before: #${player.jerseyNumber} ${player.name} - preferredHand: ${player.preferredHand}`);
        player.preferredHand = 'left';
        console.log(`After:  #${player.jerseyNumber} ${player.name} - preferredHand: ${player.preferredHand}`);
      }
    }
  }

  // Update the games table
  await client`
    UPDATE games
    SET gemini_analysis = ${JSON.stringify(analysis)}::jsonb
    WHERE id = ${gameId}
  `;

  console.log('\nUpdated gemini_analysis in games table!');
}

fixGeminiHandedness()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
