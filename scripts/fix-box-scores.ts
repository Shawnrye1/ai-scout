import { db, client } from '../lib/db/drizzle';
import { detectedPlayers } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// MONTVERDE ACADEMY - Correct box score
const montverdeStats: Record<string, {
  fgm: number; fga: number; tpm: number; tpa: number;
  ftm: number; fta: number; rebounds: number; points: number;
  assists: number; turnovers: number; blocks: number; steals: number;
}> = {
  '30': { fgm: 7, fga: 11, tpm: 3, tpa: 4, ftm: 2, fta: 2, rebounds: 2, points: 19, assists: 1, turnovers: 0, blocks: 0, steals: 1 },
  '32': { fgm: 6, fga: 16, tpm: 1, tpa: 5, ftm: 4, fta: 6, rebounds: 9, points: 17, assists: 4, turnovers: 3, blocks: 3, steals: 3 },
  '1': { fgm: 5, fga: 12, tpm: 1, tpa: 4, ftm: 3, fta: 4, rebounds: 7, points: 14, assists: 1, turnovers: 2, blocks: 0, steals: 0 },
  '25': { fgm: 5, fga: 9, tpm: 0, tpa: 0, ftm: 4, fta: 5, rebounds: 3, points: 14, assists: 3, turnovers: 1, blocks: 0, steals: 2 },
  '14': { fgm: 5, fga: 7, tpm: 0, tpa: 0, ftm: 0, fta: 0, rebounds: 3, points: 10, assists: 4, turnovers: 0, blocks: 0, steals: 0 },
  '3': { fgm: 2, fga: 3, tpm: 0, tpa: 1, ftm: 0, fta: 2, rebounds: 2, points: 4, assists: 2, turnovers: 0, blocks: 1, steals: 3 },
};

// PROLIFIC PREP - Correct box score
const prolificStats: Record<string, {
  fgm: number; fga: number; tpm: number; tpa: number;
  ftm: number; fta: number; rebounds: number; points: number;
  assists: number; turnovers: number; blocks: number; steals: number;
}> = {
  '3': { fgm: 7, fga: 15, tpm: 2, tpa: 6, ftm: 2, fta: 2, rebounds: 4, points: 18, assists: 4, turnovers: 6, blocks: 0, steals: 1 },
  '4': { fgm: 5, fga: 9, tpm: 2, tpa: 4, ftm: 5, fta: 6, rebounds: 4, points: 17, assists: 1, turnovers: 3, blocks: 0, steals: 1 },
  '0': { fgm: 5, fga: 9, tpm: 3, tpa: 6, ftm: 1, fta: 1, rebounds: 2, points: 14, assists: 2, turnovers: 2, blocks: 0, steals: 0 },
  '5': { fgm: 4, fga: 6, tpm: 1, tpa: 2, ftm: 1, fta: 1, rebounds: 2, points: 10, assists: 2, turnovers: 3, blocks: 0, steals: 0 },
  '22': { fgm: 3, fga: 4, tpm: 1, tpa: 1, ftm: 0, fta: 0, rebounds: 12, points: 7, assists: 3, turnovers: 3, blocks: 3, steals: 0 },
  '2': { fgm: 1, fga: 4, tpm: 1, tpa: 4, ftm: 0, fta: 0, rebounds: 1, points: 3, assists: 1, turnovers: 0, blocks: 0, steals: 0 },
  '10': { fgm: 1, fga: 1, tpm: 1, tpa: 1, ftm: 0, fta: 0, rebounds: 0, points: 3, assists: 1, turnovers: 0, blocks: 0, steals: 0 },
};

async function fixBoxScores() {
  const gameId = '6dd0890f-75e1-40ec-8d03-08adaf5defc7';
  const montverdeTeamId = '054ea06a-c714-4234-995c-3324da6efca3';
  const prolificTeamId = '457e232e-79d1-4e8b-ab49-7d6e0ff39bbd';

  const players = await db
    .select({
      id: detectedPlayers.id,
      jerseyNumber: detectedPlayers.jerseyNumber,
      detectedTeamId: detectedPlayers.detectedTeamId,
    })
    .from(detectedPlayers)
    .where(eq(detectedPlayers.gameId, gameId));

  console.log(`Found ${players.length} players`);

  let montverdeTotal = { pts: 0, reb: 0, ast: 0, to: 0, blk: 0, stl: 0 };
  let prolificTotal = { pts: 0, reb: 0, ast: 0, to: 0, blk: 0, stl: 0 };

  for (const player of players) {
    const jersey = player.jerseyNumber || '';
    let stats: typeof montverdeStats[string] | undefined;
    let teamName = '';

    if (player.detectedTeamId === montverdeTeamId) {
      stats = montverdeStats[jersey];
      teamName = 'Montverde';
    } else if (player.detectedTeamId === prolificTeamId) {
      stats = prolificStats[jersey];
      teamName = 'Prolific';
    }

    if (stats) {
      const metrics = {
        points: stats.points,
        rebounds: stats.rebounds,
        assists: stats.assists,
        steals: stats.steals,
        blocks: stats.blocks,
        turnovers: stats.turnovers,
        fieldGoalsMade: stats.fgm,
        fieldGoalsAttempted: stats.fga,
        threePointersMade: stats.tpm,
        threePointersAttempted: stats.tpa,
        freeThrowsMade: stats.ftm,
        freeThrowsAttempted: stats.fta,
        fieldGoalPercentage: stats.fga > 0 ? Math.round((stats.fgm / stats.fga) * 100) : 0,
        threePointPercentage: stats.tpa > 0 ? Math.round((stats.tpm / stats.tpa) * 100) : 0,
        freeThrowPercentage: stats.fta > 0 ? Math.round((stats.ftm / stats.fta) * 100) : 0,
      };

      const grade = stats.points >= 15 ? 90 : stats.points >= 10 ? 80 : stats.points >= 5 ? 70 : 60;

      await client`
        UPDATE player_analysis
        SET metrics = ${JSON.stringify(metrics)}::jsonb,
            overall_grade = ${grade}
        WHERE detected_player_id = ${player.id}
      `;

      if (player.detectedTeamId === montverdeTeamId) {
        montverdeTotal.pts += stats.points;
        montverdeTotal.reb += stats.rebounds;
        montverdeTotal.ast += stats.assists;
        montverdeTotal.to += stats.turnovers;
        montverdeTotal.blk += stats.blocks;
        montverdeTotal.stl += stats.steals;
      } else {
        prolificTotal.pts += stats.points;
        prolificTotal.reb += stats.rebounds;
        prolificTotal.ast += stats.assists;
        prolificTotal.to += stats.turnovers;
        prolificTotal.blk += stats.blocks;
        prolificTotal.stl += stats.steals;
      }

      console.log(`Updated #${jersey} (${teamName}): ${stats.points}pts, ${stats.rebounds}reb, ${stats.assists}ast, ${stats.turnovers}to, ${stats.blocks}blk, ${stats.steals}stl`);
    } else {
      console.log(`No stats for #${jersey} (team: ${player.detectedTeamId})`);
    }
  }

  console.log(`\nMontverde: ${montverdeTotal.pts}pts, ${montverdeTotal.reb}reb, ${montverdeTotal.ast}ast, ${montverdeTotal.to}to, ${montverdeTotal.blk}blk, ${montverdeTotal.stl}stl`);
  console.log(`Prolific: ${prolificTotal.pts}pts, ${prolificTotal.reb}reb, ${prolificTotal.ast}ast, ${prolificTotal.to}to, ${prolificTotal.blk}blk, ${prolificTotal.stl}stl`);
}

fixBoxScores()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
