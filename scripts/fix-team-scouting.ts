import { db } from '../lib/db/drizzle';
import { games } from '../lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Re-maps existing agentResults.offensive/defensive to teamScouting
 * Fixes the issue where team name matching didn't work properly
 */
async function main() {
  const gameList = await db.select().from(games).orderBy(desc(games.createdAt)).limit(1);
  const game = gameList[0];

  if (!game || !game.geminiAnalysis) {
    console.log('No game with analysis found');
    return;
  }

  const analysis = game.geminiAnalysis as any;
  const homeTeamName = analysis.homeTeamName || 'Home';
  const awayTeamName = analysis.awayTeamName || 'Away';

  console.log('=== Fixing Team Scouting ===');
  console.log('Game:', game.title);
  console.log('Home:', homeTeamName);
  console.log('Away:', awayTeamName);

  // Get offensive/defensive results
  const offensiveResults = analysis.agentResults?.offensive || [];
  const defensiveResults = analysis.agentResults?.defensive || [];

  const offensiveArray = Array.isArray(offensiveResults) ? offensiveResults.filter(Boolean) : (offensiveResults ? [offensiveResults] : []);
  const defensiveArray = Array.isArray(defensiveResults) ? defensiveResults.filter(Boolean) : (defensiveResults ? [defensiveResults] : []);

  console.log('Offensive results count:', offensiveArray.length);
  console.log('Defensive results count:', defensiveArray.length);

  // Match function
  const matchTeam = (arr: any[], teamName: string, isHome: boolean) => {
    // First try literal match on home/away
    const literal = arr.find((o: any) => o?.team?.toLowerCase() === (isHome ? 'home' : 'away'));
    if (literal) return literal;

    // Then try matching the actual team name
    if (teamName) {
      const byName = arr.find((o: any) => o?.team?.toLowerCase()?.includes(teamName.toLowerCase().split(' ')[0]));
      if (byName) return byName;
    }

    // Fallback: assume array order is [home, away]
    if (arr.length === 2) {
      return isHome ? arr[0] : arr[1];
    }

    return null;
  };

  const homeOffense = matchTeam(offensiveArray, homeTeamName, true);
  const awayOffense = matchTeam(offensiveArray, awayTeamName, false);
  const homeDefense = matchTeam(defensiveArray, homeTeamName, true);
  const awayDefense = matchTeam(defensiveArray, awayTeamName, false);

  console.log('\nMatched:');
  console.log('  homeOffense:', homeOffense?.team || 'NOT FOUND');
  console.log('  awayOffense:', awayOffense?.team || 'NOT FOUND');
  console.log('  homeDefense:', homeDefense?.team || 'NOT FOUND');
  console.log('  awayDefense:', awayDefense?.team || 'NOT FOUND');

  // Build updated teamScouting
  const updatedTeamScouting = {
    homeTeam: {
      jerseyColor: analysis.teamScouting?.homeTeam?.jerseyColor,
      offensiveSystem: homeOffense?.primarySystem,
      defensiveSystem: homeDefense?.baseDefense,
      pnrCoverage: homeDefense?.pnrCoverage,
      offensiveTendencies: homeOffense?.tendencies,
      defensiveTendencies: homeDefense?.tendencies,
      transitionStyle: homeOffense?.transitionStyle,
      spacing: homeOffense?.spacing,
      keyOffensivePlayers: homeOffense?.keyOffensivePlayers,
      keyDefenders: homeDefense?.keyDefenders,
      offensiveWeaknesses: homeOffense?.weaknessesToExploit,
      defensiveWeaknesses: homeDefense?.weaknessesToAttack,
    },
    awayTeam: {
      jerseyColor: analysis.teamScouting?.awayTeam?.jerseyColor,
      offensiveSystem: awayOffense?.primarySystem,
      defensiveSystem: awayDefense?.baseDefense,
      pnrCoverage: awayDefense?.pnrCoverage,
      offensiveTendencies: awayOffense?.tendencies,
      defensiveTendencies: awayDefense?.tendencies,
      transitionStyle: awayOffense?.transitionStyle,
      spacing: awayOffense?.spacing,
      keyOffensivePlayers: awayOffense?.keyOffensivePlayers,
      keyDefenders: awayDefense?.keyDefenders,
      offensiveWeaknesses: awayOffense?.weaknessesToExploit,
      defensiveWeaknesses: awayDefense?.weaknessesToAttack,
    },
  };

  console.log('\n=== Updated Home Team ===');
  console.log(JSON.stringify(updatedTeamScouting.homeTeam, null, 2));

  console.log('\n=== Updated Away Team ===');
  console.log(JSON.stringify(updatedTeamScouting.awayTeam, null, 2));

  // Update database
  const updatedAnalysis = {
    ...analysis,
    teamScouting: updatedTeamScouting,
  };

  await db.update(games).set({
    geminiAnalysis: updatedAnalysis,
  }).where(eq(games.id, game.id));

  console.log('\n✅ Database updated successfully!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
