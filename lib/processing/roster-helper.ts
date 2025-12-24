/**
 * Helper functions for fetching roster data for ML processing
 */

import { db } from '@/lib/db/drizzle';
import { games, teams, sportsTeams, sportsTeamPlayers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { TeamRoster, RosterPlayer } from './modal';

interface RosterResult {
  isHomeGame: boolean | null;
  homeTeamRoster: TeamRoster | undefined;
  awayTeamRoster: TeamRoster | undefined;
}

/**
 * Fetch roster data for a game, including both teams
 *
 * @param gameId - The UUID of the game
 * @returns Object containing home/away rosters and isHomeGame flag
 */
export async function fetchGameRosters(gameId: string): Promise<RosterResult> {
  // Get game with team and opponent info
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { isHomeGame: null, homeTeamRoster: undefined, awayTeamRoster: undefined };
  }

  let coachTeamRoster: TeamRoster | undefined;
  let opponentTeamRoster: TeamRoster | undefined;

  // Fetch coach's team roster
  const coachTeam = await db.query.teams.findFirst({
    where: eq(teams.id, game.teamId),
    with: {
      sportsTeam: {
        with: {
          players: true,
        },
      },
    },
  });

  if (coachTeam?.sportsTeam) {
    const st = coachTeam.sportsTeam;
    coachTeamRoster = {
      teamId: st.id,
      teamName: st.name,
      sport: st.sport,
      jerseyColorHome: st.jerseyColorHome,
      jerseyColorAway: st.jerseyColorAway,
      players: (st.players || []).map(p => ({
        jerseyNumber: p.jerseyNumber,
        name: p.name,
        position: p.position,
        height: p.height,
        weight: p.weight,
      })),
    };
  }

  // Fetch opponent team roster if specified
  if (game.opponentSportsTeamId) {
    const opponentTeam = await db.query.sportsTeams.findFirst({
      where: eq(sportsTeams.id, game.opponentSportsTeamId),
      with: {
        players: true,
      },
    });

    if (opponentTeam) {
      opponentTeamRoster = {
        teamId: opponentTeam.id,
        teamName: opponentTeam.name,
        sport: opponentTeam.sport,
        jerseyColorHome: opponentTeam.jerseyColorHome,
        jerseyColorAway: opponentTeam.jerseyColorAway,
        players: (opponentTeam.players || []).map(p => ({
          jerseyNumber: p.jerseyNumber,
          name: p.name,
          position: p.position,
          height: p.height,
          weight: p.weight,
        })),
      };
    }
  }

  // Determine which roster is home and which is away
  const isHomeGame = game.isHomeGame;

  return {
    isHomeGame,
    homeTeamRoster: isHomeGame === true ? coachTeamRoster : (isHomeGame === false ? opponentTeamRoster : coachTeamRoster),
    awayTeamRoster: isHomeGame === true ? opponentTeamRoster : (isHomeGame === false ? coachTeamRoster : opponentTeamRoster),
  };
}
