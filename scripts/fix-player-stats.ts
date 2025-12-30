import { db } from '../lib/db/drizzle';
import { detectedPlayers, detectedTeams, playerAnalysis } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// Box score data from user - Montverde Academy 78 vs Prolific Prep 72
const boxScoreData = {
  home: {
    name: 'Montverde Academy',
    score: 78,
    players: [
      { jersey: 1, name: 'Robert Wright', pts: 14, reb: 1, ast: 2, blk: 0, stl: 0 },
      { jersey: 3, name: 'Curtis Givens', pts: 4, reb: 2, ast: 0, blk: 1, stl: 2 },
      { jersey: 14, name: 'Asa Newell', pts: 10, reb: 4, ast: 0, blk: 0, stl: 0 },
      { jersey: 25, name: 'Derik Queen', pts: 14, reb: 3, ast: 1, blk: 0, stl: 2 },
      { jersey: 30, name: 'Liam McNeeley', pts: 19, reb: 1, ast: 0, blk: 0, stl: 1 },
      { jersey: 32, name: 'Cooper Flagg', pts: 17, reb: 4, ast: 3, blk: 3, stl: 3 },
    ]
  },
  away: {
    name: 'Prolific Prep',
    score: 72,
    players: [
      { jersey: 0, name: 'Mikey Lewis', pts: 14, reb: 2, ast: 2, blk: 0, stl: 0 },
      { jersey: 2, name: 'Winters Grady', pts: 3, reb: 1, ast: 0, blk: 0, stl: 0 },
      { jersey: 3, name: 'AJ Dybantsa', pts: 18, reb: 4, ast: 6, blk: 0, stl: 1 },
      { jersey: 4, name: 'Tyran Stokes', pts: 17, reb: 1, ast: 3, blk: 0, stl: 1 },
      { jersey: 5, name: 'Zoom Diallo', pts: 10, reb: 2, ast: 3, blk: 0, stl: 0 },
      { jersey: 10, name: 'Liam Dayco-Green', pts: 3, reb: 1, ast: 0, blk: 0, stl: 0 },
      { jersey: 22, name: 'Aiden Sherrell', pts: 7, reb: 3, ast: 1, blk: 3, stl: 0 },
    ]
  }
};

async function main() {
  const gameId = 'c3bab412-5311-4417-b3a1-334245f3eb5e';

  // Get teams
  const teams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  console.log('Found', teams.length, 'teams');

  for (const team of teams) {
    const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.detectedTeamId, team.id));
    const jerseys = players.map(p => p.jerseyNumber ? parseInt(p.jerseyNumber) : null).filter(j => j !== null);

    // Count matches with unique jersey numbers (excluding #3 which exists on both teams)
    const homeUniqueJerseys = [1, 14, 25, 30, 32]; // Montverde unique numbers
    const awayUniqueJerseys = [0, 2, 4, 5, 10, 22]; // Prolific Prep unique numbers

    const homeMatches = jerseys.filter(j => homeUniqueJerseys.includes(j as number)).length;
    const awayMatches = jerseys.filter(j => awayUniqueJerseys.includes(j as number)).length;

    console.log(`\nTeam ${team.id.substring(0, 8)}: jerseys=${jerseys.join(',')}`);
    console.log(`  Home matches: ${homeMatches}, Away matches: ${awayMatches}`);

    const isHome = homeMatches > awayMatches;
    const boxData = isHome ? boxScoreData.home : boxScoreData.away;

    console.log(`  Identified as: ${boxData.name} (${isHome ? 'HOME' : 'AWAY'})`);

    // Update team name
    await db.update(detectedTeams).set({
      teamName: boxData.name,
      teamLabel: isHome ? 'home' : 'away'
    }).where(eq(detectedTeams.id, team.id));

    // Update each player
    for (const player of players) {
      const playerJersey = player.jerseyNumber ? parseInt(player.jerseyNumber) : null;
      const boxPlayer = boxData.players.find(bp => bp.jersey === playerJersey);

      if (boxPlayer) {
        console.log(`  ✓ #${boxPlayer.jersey} ${boxPlayer.name}: ${boxPlayer.pts}pts, ${boxPlayer.reb}reb, ${boxPlayer.ast}ast`);

        // Update player name
        await db.update(detectedPlayers).set({
          displayName: boxPlayer.name
        }).where(eq(detectedPlayers.id, player.id));

        // Get or create player analysis
        const [existingAnalysis] = await db.select().from(playerAnalysis).where(eq(playerAnalysis.detectedPlayerId, player.id));

        const metrics = {
          gamesPlayed: 1,
          points: boxPlayer.pts,
          rebounds: boxPlayer.reb,
          assists: boxPlayer.ast,
          blocks: boxPlayer.blk,
          steals: boxPlayer.stl,
          ppg: boxPlayer.pts,
          rpg: boxPlayer.reb,
          apg: boxPlayer.ast,
          bpg: boxPlayer.blk,
          spg: boxPlayer.stl
        };

        if (existingAnalysis) {
          await db.update(playerAnalysis).set({
            metrics: metrics as any
          }).where(eq(playerAnalysis.id, existingAnalysis.id));
        } else {
          await db.insert(playerAnalysis).values({
            detectedPlayerId: player.id,
            metrics: metrics as any,
            overallGrade: '85'
          });
        }
      } else {
        console.log(`  ✗ No box score for #${player.jerseyNumber} ${player.displayName}`);
      }
    }
  }

  console.log('\n✅ Stats updated from box score!');
}

main().catch(console.error);
