import { db } from '../lib/db/drizzle';
import { games, detectedPlayers, playerAnalysis, detectedTeams } from '../lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Correct box score data - separated by team
// PROLIFIC PREP (72) - Away team
const prolificPrepStats: Record<string, any> = {
  '0': { points: 14, rebounds: 2, assists: 2, steals: 2, blocks: 0, turnovers: 2, fgm: 5, fga: 9, threePm: 3, threePa: 6 }, // Mikey Lewis
  '2': { points: 3, rebounds: 1, assists: 1, steals: 0, blocks: 0, turnovers: 0, fgm: 1, fga: 4, threePm: 1, threePa: 4 }, // Winters Grady
  '3': { points: 18, rebounds: 4, assists: 4, steals: 1, blocks: 0, turnovers: 6, fgm: 7, fga: 15, threePm: 2, threePa: 6 }, // AJ Dybantsa
  '4': { points: 17, rebounds: 4, assists: 1, steals: 2, blocks: 0, turnovers: 3, fgm: 5, fga: 9, threePm: 2, threePa: 4 }, // Tyran Stokes
  '5': { points: 10, rebounds: 2, assists: 2, steals: 1, blocks: 0, turnovers: 3, fgm: 4, fga: 6, threePm: 1, threePa: 2 }, // Zoom Diallo
  '10': { points: 3, rebounds: 0, assists: 1, steals: 0, blocks: 0, turnovers: 0, fgm: 1, fga: 1, threePm: 1, threePa: 1 }, // Liam Dayco-Green
  '22': { points: 7, rebounds: 10, assists: 3, steals: 0, blocks: 3, turnovers: 1, fgm: 3, fga: 4, threePm: 1, threePa: 1 }, // Aiden Sherrell
};

// MONTVERDE ACADEMY (78) - Home team
const montverdeStats: Record<string, any> = {
  '1': { points: 14, rebounds: 7, assists: 12, steals: 2, blocks: 0, turnovers: 3, fgm: 5, fga: 12, threePm: 1, threePa: 4 }, // Robert Wright
  '3': { points: 4, rebounds: 2, assists: 2, steals: 3, blocks: 2, turnovers: 1, fgm: 2, fga: 3, threePm: 0, threePa: 1 }, // Curtis Givens
  '14': { points: 10, rebounds: 3, assists: 4, steals: 0, blocks: 0, turnovers: 4, fgm: 5, fga: 7, threePm: 0, threePa: 0 }, // Asa Newell
  '25': { points: 14, rebounds: 3, assists: 1, steals: 2, blocks: 0, turnovers: 3, fgm: 5, fga: 9, threePm: 0, threePa: 0 }, // Derik Queen
  '30': { points: 19, rebounds: 2, assists: 1, steals: 2, blocks: 0, turnovers: 1, fgm: 7, fga: 11, threePm: 3, threePa: 4 }, // Liam McNeeley
  '32': { points: 17, rebounds: 9, assists: 4, steals: 3, blocks: 3, turnovers: 3, fgm: 6, fga: 16, threePm: 1, threePa: 5 }, // Cooper Flagg
};

// Calculate overall grade based on stats
function calculateOverallGrade(stats: { points: number; rebounds: number; assists: number; steals: number; blocks: number } | null): number {
  if (!stats) return 70;

  let grade = 60;
  grade += Math.min(stats.points * 1.5, 20);
  grade += Math.min(stats.rebounds * 2, 10);
  grade += Math.min(stats.assists * 2.5, 10);
  grade += Math.min((stats.steals + stats.blocks) * 3, 10);

  return Math.min(Math.round(grade), 99);
}

async function main() {
  const gameId = '6dd0890f-75e1-40ec-8d03-08adaf5defc7';

  // Get teams
  const teams = await db.select().from(detectedTeams).where(eq(detectedTeams.gameId, gameId));
  const homeTeamId = teams.find(t => t.teamLabel === 'home')?.id;
  const awayTeamId = teams.find(t => t.teamLabel === 'away')?.id;

  console.log('Home team (Montverde):', homeTeamId);
  console.log('Away team (Prolific Prep):', awayTeamId);

  // Get all players for this game
  const players = await db.select().from(detectedPlayers).where(eq(detectedPlayers.gameId, gameId));
  console.log('\nUpdating', players.length, 'players...');

  // Get existing player analysis for tendencies
  const playerIds = players.map(p => p.id);
  const analyses = await db.select().from(playerAnalysis).where(inArray(playerAnalysis.detectedPlayerId, playerIds));
  const tendenciesMap = new Map<string, any>();
  for (const a of analyses) {
    tendenciesMap.set(a.detectedPlayerId, a.tendencies);
  }

  let updated = 0;
  for (const player of players) {
    const jersey = player.jerseyNumber;
    if (!jersey) {
      console.log(`  Player ${player.id}: No jersey number`);
      continue;
    }

    // Determine team and get correct stats
    const isHome = player.detectedTeamId === homeTeamId;
    const teamName = isHome ? 'Montverde' : 'Prolific';
    const statsMap = isHome ? montverdeStats : prolificPrepStats;
    const stats = statsMap[jersey] || statsMap[jersey.replace(/^0+/, '')] || statsMap[jersey.padStart(2, '0')];

    if (!stats) {
      console.log(`  #${jersey} (${teamName}): No box score stats found`);
      continue;
    }

    const overallGrade = calculateOverallGrade(stats);
    const tendencies = tendenciesMap.get(player.id) as any;

    // Generate development areas
    const developmentAreas: string[] = [];
    if (tendencies?.defensiveRating === 'average' || tendencies?.defensiveRating === 'below average') {
      developmentAreas.push('Defense');
    }
    if (tendencies?.preferredHand) {
      const weakHand = tendencies.preferredHand === 'right' ? 'Left Hand' : 'Right Hand';
      developmentAreas.push(`Develop ${weakHand}`);
    }
    if (stats.turnovers > 3) {
      developmentAreas.push('Ball Security');
    }

    // Update player analysis
    await db.update(playerAnalysis)
      .set({
        overallGrade: overallGrade.toString(),
        metrics: {
          points: stats.points,
          rebounds: stats.rebounds,
          assists: stats.assists,
          steals: stats.steals,
          blocks: stats.blocks,
          turnovers: stats.turnovers,
          fgm: stats.fgm,
          fga: stats.fga,
          threePm: stats.threePm,
          threePa: stats.threePa,
          gamesPlayed: 1,
        },
        developmentAreas: developmentAreas.length > 0 ? developmentAreas : null,
        updatedAt: new Date(),
      })
      .where(eq(playerAnalysis.detectedPlayerId, player.id));

    console.log(`  #${jersey} (${teamName}): Grade ${overallGrade}, ${stats.points}pts, ${stats.rebounds}reb, ${stats.assists}ast`);
    updated++;
  }

  console.log('\nUpdated', updated, 'players with stats and grades');

  // Verify totals
  let prolificTotal = 0, montverdeTotal = 0;
  for (const s of Object.values(prolificPrepStats)) prolificTotal += s.points;
  for (const s of Object.values(montverdeStats)) montverdeTotal += s.points;
  console.log(`\nVerification - Prolific Prep: ${prolificTotal} pts, Montverde: ${montverdeTotal} pts`);
}

main().catch(console.error);
