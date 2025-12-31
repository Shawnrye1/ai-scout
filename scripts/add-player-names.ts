import { client } from '../lib/db/drizzle';

// Player names from box score
const montverdeNames: Record<string, string> = {
  '30': 'Liam McNeeley',
  '32': 'Cooper Flagg',
  '1': 'Robert Wright',
  '25': 'Derik Queen',
  '14': 'Asa Newell',
  '3': 'Curtis Givens',
};

const prolificNames: Record<string, string> = {
  '3': 'AJ Dybantsa',
  '4': 'Tyran Stokes',
  '0': 'Mikey Lewis',
  '5': 'Vazoumana Diallo',
  '22': 'Aiden Sherrell',
  '2': 'Winters Grady',
  '10': 'Liam Dayco-Green',
};

async function addPlayerNames() {
  const gameId = '6dd0890f-75e1-40ec-8d03-08adaf5defc7';
  const montverdeTeamId = '054ea06a-c714-4234-995c-3324da6efca3';
  const prolificTeamId = '457e232e-79d1-4e8b-ab49-7d6e0ff39bbd';

  // Update Montverde players
  for (const [jersey, name] of Object.entries(montverdeNames)) {
    await client`
      UPDATE detected_players
      SET display_name = ${name}
      WHERE game_id = ${gameId}
        AND detected_team_id = ${montverdeTeamId}
        AND jersey_number = ${jersey}
    `;
    console.log(`Montverde #${jersey}: ${name}`);
  }

  // Update Prolific players
  for (const [jersey, name] of Object.entries(prolificNames)) {
    await client`
      UPDATE detected_players
      SET display_name = ${name}
      WHERE game_id = ${gameId}
        AND detected_team_id = ${prolificTeamId}
        AND jersey_number = ${jersey}
    `;
    console.log(`Prolific #${jersey}: ${name}`);
  }

  console.log('\nDone!');
}

addPlayerNames()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
