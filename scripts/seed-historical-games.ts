import { db } from '../lib/db/drizzle';
import { games, detectedPlayers, playerAnalysis, detectedTeams } from '../lib/db/schema';

async function seedHistoricalGames() {
  const userId = 1; // Integer user ID for shawnrearl@gmail.com
  const teamId = 1; // Integer team ID

  console.log('Creating historical games for Season Progression...');

  // Historical game data (going back in time)
  const historicalGames = [
    { name: 'vs Oak Hill Academy', daysAgo: 7, avgGrade: 82 },
    { name: 'vs IMG Academy', daysAgo: 14, avgGrade: 75 },
    { name: 'vs Sunrise Christian', daysAgo: 21, avgGrade: 79 },
    { name: 'vs AZ Compass Prep', daysAgo: 28, avgGrade: 71 },
    { name: 'vs Link Academy', daysAgo: 35, avgGrade: 68 },
  ];

  // Sample players with grades that show progression
  // Grades array: [most recent, older, older, oldest, oldest]
  const samplePlayers = [
    { jerseyNumber: '32', name: 'Cooper Flagg', grades: [92, 88, 85, 80, 75] }, // Improving
    { jerseyNumber: '25', name: 'Derik Queen', grades: [88, 90, 86, 82, 80] },  // Improving
    { jerseyNumber: '14', name: 'Asa Newell', grades: [85, 82, 84, 81, 83] },   // Stable
    { jerseyNumber: '30', name: 'James Williams', grades: [72, 75, 78, 80, 82] }, // Needs attention (declining trend)
    { jerseyNumber: '0', name: 'Tyran Stokes', grades: [65, 70, 75, 78, 80] },  // Needs attention
    { jerseyNumber: '11', name: 'Ace Flagg', grades: [78, 80, 77, 79, 76] },    // Stable
  ];

  for (let i = 0; i < historicalGames.length; i++) {
    const game = historicalGames[i];
    const gameDate = new Date();
    gameDate.setDate(gameDate.getDate() - game.daysAgo);

    console.log(`Creating game: ${game.name} (${game.daysAgo} days ago)`);

    // Create the game
    const [newGame] = await db.insert(games).values({
      userId,
      teamId,
      name: game.name,
      status: 'ready',
      gameDate: gameDate,
      createdAt: gameDate,
      updatedAt: gameDate,
    }).returning();

    console.log(`Created game: ${newGame.id}`);

    // Create a detected team for this game
    const [detectedTeam] = await db.insert(detectedTeams).values({
      gameId: newGame.id,
      teamLabel: 'home',
      isUserTeam: true,
      teamName: 'Montverde Academy',
      primaryJerseyColor: 'dark green',
      createdAt: gameDate,
    }).returning();

    console.log(`Created detected team: ${detectedTeam.id}`);

    // Add players with their grades for this game
    for (const player of samplePlayers) {
      const [detectedPlayer] = await db.insert(detectedPlayers).values({
        gameId: newGame.id,
        jerseyNumber: player.jerseyNumber,
        detectedTeamId: detectedTeam.id,
        displayName: `#${player.jerseyNumber}`,
        createdAt: gameDate,
      }).returning();

      // Add player analysis with the grade for this specific game
      await db.insert(playerAnalysis).values({
        detectedPlayerId: detectedPlayer.id,
        overallGrade: String(player.grades[i]),
        metrics: {
          points: Math.floor(Math.random() * 20) + 10,
          rebounds: Math.floor(Math.random() * 10) + 2,
          assists: Math.floor(Math.random() * 8) + 1,
        },
        developmentAreas: i < 2 ? ['Three-point shooting', 'Court vision'] : ['Defense', 'Ball handling'],
        createdAt: gameDate,
        updatedAt: gameDate,
      });
    }

    console.log(`Added ${samplePlayers.length} players to game ${newGame.id}`);
  }

  console.log('\nDone! Created 5 historical games with player data.');
  process.exit(0);
}

seedHistoricalGames().catch(console.error);
