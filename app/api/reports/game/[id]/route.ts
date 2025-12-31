import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedTeams, playerAnalysis, keyMoments } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: gameId } = await params;

    // Get the game
    const [game] = await db
      .select()
      .from(games)
      .where(and(eq(games.id, gameId), eq(games.userId, user.id)));

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get teams for this game
    const teams = await db
      .select()
      .from(detectedTeams)
      .where(eq(detectedTeams.gameId, gameId));

    const homeTeamData = teams.find((t) => t.teamLabel === 'home' || t.isUserTeam);
    const awayTeamData = teams.find((t) => t.teamLabel === 'away' || !t.isUserTeam);

    // Get players with analysis
    const playersWithAnalysis = await db
      .select({
        id: detectedPlayers.id,
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
        teamId: detectedPlayers.detectedTeamId,
        overallGrade: playerAnalysis.overallGrade,
        metrics: playerAnalysis.metrics,
      })
      .from(detectedPlayers)
      .leftJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
      .where(eq(detectedPlayers.gameId, gameId))
      .orderBy(desc(playerAnalysis.overallGrade));

    // Separate by team
    const homePlayers = playersWithAnalysis.filter((p) => p.teamId === homeTeamData?.id);
    const awayPlayers = playersWithAnalysis.filter((p) => p.teamId === awayTeamData?.id);

    // Get top performers (all players sorted by grade)
    const topPerformers = playersWithAnalysis
      .filter((p) => p.overallGrade)
      .slice(0, 10)
      .map((p) => ({
        jerseyNumber: p.jerseyNumber || '?',
        name: p.displayName || `#${p.jerseyNumber}`,
        grade: parseFloat(p.overallGrade?.toString() || '0'),
        stats: p.metrics as any,
      }));

    // Get key moments
    const moments = await db
      .select({
        description: keyMoments.description,
        timestampSeconds: keyMoments.timestampSeconds,
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
      })
      .from(keyMoments)
      .innerJoin(detectedPlayers, eq(detectedPlayers.id, keyMoments.detectedPlayerId))
      .where(eq(detectedPlayers.gameId, gameId))
      .orderBy(desc(keyMoments.createdAt))
      .limit(10);

    // Extract coaching insights from geminiAnalysis
    let coachingInsights: string[] = [];
    if (game.geminiAnalysis) {
      const analysis = game.geminiAnalysis as any;
      if (analysis.coachingInsights?.insights && Array.isArray(analysis.coachingInsights.insights)) {
        coachingInsights = analysis.coachingInsights.insights;
      } else if (analysis.coachingInsights?.gameNarrative) {
        // Use the game narrative as coaching insight
        coachingInsights.push(analysis.coachingInsights.gameNarrative);
      }
      if (analysis.coachingInsights?.keyTakeaways && Array.isArray(analysis.coachingInsights.keyTakeaways)) {
        coachingInsights.push(...analysis.coachingInsights.keyTakeaways);
      }
      if (analysis.gameFlow?.keyInsights && Array.isArray(analysis.gameFlow.keyInsights)) {
        coachingInsights.push(...analysis.gameFlow.keyInsights);
      }
      if (analysis.teamScouting?.homeTeam?.tendencies && Array.isArray(analysis.teamScouting.homeTeam.tendencies)) {
        coachingInsights.push(...analysis.teamScouting.homeTeam.tendencies);
      }
    }

    // Try to extract scores from geminiAnalysis
    let homeScore: number | undefined;
    let awayScore: number | undefined;
    if (game.geminiAnalysis) {
      const analysis = game.geminiAnalysis as any;
      if (analysis.gameInfo?.finalScore) {
        homeScore = analysis.gameInfo.finalScore.home;
        awayScore = analysis.gameInfo.finalScore.away;
      }
    }

    const report = {
      id: game.id,
      name: game.name || game.title || 'Game',
      date: game.createdAt?.toISOString() || '',
      sport: game.sport || 'Basketball',
      homeTeam: {
        name: homeTeamData?.teamName || 'Home Team',
        score: homeScore,
        players: homePlayers.map((p) => ({
          jerseyNumber: p.jerseyNumber,
          name: p.displayName,
          grade: p.overallGrade ? parseFloat(p.overallGrade.toString()) : null,
        })),
      },
      awayTeam: {
        name: awayTeamData?.teamName || 'Away Team',
        score: awayScore,
        players: awayPlayers.map((p) => ({
          jerseyNumber: p.jerseyNumber,
          name: p.displayName,
          grade: p.overallGrade ? parseFloat(p.overallGrade.toString()) : null,
        })),
      },
      topPerformers,
      keyMoments: moments.map((m) => ({
        description: m.description || '',
        player: m.displayName || `#${m.jerseyNumber}`,
        timestamp: m.timestampSeconds
          ? `${Math.floor(parseFloat(m.timestampSeconds) / 60)}:${String(Math.floor(parseFloat(m.timestampSeconds) % 60)).padStart(2, '0')}`
          : null,
      })),
      coachingInsights: coachingInsights.slice(0, 5),
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Game report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
