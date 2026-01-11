import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { games, detectedPlayers, detectedTeams, playerAnalysis, keyMoments, teamMembers } from '@/lib/db/schema';
import { desc, eq, and, inArray } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

function normalizeDevArea(area: string): string | null {
  const lower = area.toLowerCase();
  // Skip generic hand development suggestions - not useful for elite players
  if (lower.includes('left hand') || lower.includes('right hand')) return null;
  if (lower.includes('shooting') || lower.includes('shot')) return 'Shooting';
  if (lower.includes('defense') || lower.includes('defensive')) return 'Defense';
  if (lower.includes('ball handling') || lower.includes('dribbl')) return 'Ball Handling';
  if (lower.includes('passing') || lower.includes('assist')) return 'Passing';
  if (lower.includes('rebound')) return 'Rebounding';
  if (lower.includes('footwork') || lower.includes('feet')) return 'Footwork';
  if (lower.includes('decision') || lower.includes('iq')) return 'Basketball IQ';
  if (lower.includes('transition') || lower.includes('fast break')) return 'Transition';
  if (lower.includes('post') || lower.includes('low block')) return 'Post Play';
  if (lower.includes('screen') || lower.includes('pick')) return 'Screening';
  if (lower.includes('communication')) return 'Communication';
  if (lower.includes('conditioning') || lower.includes('endurance')) return 'Conditioning';
  if (lower.includes('ball security') || lower.includes('turnover')) return 'Ball Security';
  return area.charAt(0).toUpperCase() + area.slice(1).toLowerCase();
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's team - all team members see same data
    const teamMember = await db.query.teamMembers.findFirst({
      where: (tm, { eq }) => eq(tm.userId, user.id),
    });
    const teamId = teamMember?.teamId;
    if (!teamId) {
      return NextResponse.json({ players: [] });
    }

    // Get all players from team's games with their full analysis
    const playersData = await db
      .select({
        id: detectedPlayers.id,
        jerseyNumber: detectedPlayers.jerseyNumber,
        displayName: detectedPlayers.displayName,
        positionGuess: detectedPlayers.positionGuess,
        gameId: detectedPlayers.gameId,
        teamName: detectedTeams.teamName,
        teamLabel: detectedTeams.teamLabel,
        isUserTeam: detectedTeams.isUserTeam,
        gameName: games.name,
        gameTitle: games.title,
        gameDate: games.createdAt,
        overallGrade: playerAnalysis.overallGrade,
        metrics: playerAnalysis.metrics,
        tendencies: playerAnalysis.tendencies,
        strengths: playerAnalysis.strengths,
        developmentAreas: playerAnalysis.developmentAreas,
        summary: playerAnalysis.summary,
      })
      .from(detectedPlayers)
      .innerJoin(games, eq(games.id, detectedPlayers.gameId))
      .innerJoin(detectedTeams, eq(detectedTeams.id, detectedPlayers.detectedTeamId))
      .leftJoin(playerAnalysis, eq(playerAnalysis.detectedPlayerId, detectedPlayers.id))
      .where(and(eq(games.teamId, teamId), eq(detectedTeams.isUserTeam, true)))
      .orderBy(desc(games.createdAt));

    // Get all player IDs for key moments lookup
    const playerIds = playersData.map((p) => p.id);

    // Get key moments for all players
    const allKeyMoments = playerIds.length > 0
      ? await db
          .select({
            playerId: keyMoments.detectedPlayerId,
            description: keyMoments.description,
            sentiment: keyMoments.sentiment,
            momentType: keyMoments.momentType,
            timestampSeconds: keyMoments.timestampSeconds,
            createdAt: keyMoments.createdAt,
          })
          .from(keyMoments)
          .where(inArray(keyMoments.detectedPlayerId, playerIds))
          .orderBy(desc(keyMoments.createdAt))
      : [];

    // Group key moments by player
    const momentsByPlayer = new Map<string, typeof allKeyMoments>();
    for (const moment of allKeyMoments) {
      if (!momentsByPlayer.has(moment.playerId)) {
        momentsByPlayer.set(moment.playerId, []);
      }
      momentsByPlayer.get(moment.playerId)!.push(moment);
    }

    // Group by jersey number to aggregate across games
    const playerMap = new Map<string, {
      id: string;
      jerseyNumber: string;
      displayName: string | null;
      positionGuess: string | null;
      teamName: string;
      grades: number[];
      allStats: { points: number; rebounds: number; assists: number; steals: number; blocks: number };
      games: { gameId: string; gameName: string; grade: number; date: string; stats: any }[];
      allStrengths: string[];
      allDevAreas: string[];
      latestSummary: string | null;
      latestTendencies: any;
      keyMoments: typeof allKeyMoments;
      playerIds: string[];
    }>();

    for (const player of playersData) {
      // Group by jersey number only - since we filter to isUserTeam=true, all are same team
      const key = `${player.jerseyNumber}`;

      if (!playerMap.has(key)) {
        playerMap.set(key, {
          id: player.id,
          jerseyNumber: player.jerseyNumber || '??',
          displayName: player.displayName,
          positionGuess: player.positionGuess,
          teamName: player.teamName || player.teamLabel || 'Unknown',
          grades: [],
          allStats: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 },
          games: [],
          allStrengths: [],
          allDevAreas: [],
          latestSummary: null,
          latestTendencies: null,
          keyMoments: [],
          playerIds: [],
        });
      }

      const entry = playerMap.get(key)!;
      entry.playerIds.push(player.id);

      const grade = player.overallGrade ? parseFloat(player.overallGrade.toString()) : null;

      if (grade !== null) {
        entry.grades.push(grade);
      }

      // Extract stats from metrics
      const metrics = player.metrics as any;
      let gameStats = { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 };
      if (metrics) {
        gameStats = {
          points: metrics.points || metrics.totalPoints || 0,
          rebounds: metrics.rebounds || metrics.totalRebounds || 0,
          assists: metrics.assists || 0,
          steals: metrics.steals || 0,
          blocks: metrics.blocks || 0,
        };
        entry.allStats.points += gameStats.points;
        entry.allStats.rebounds += gameStats.rebounds;
        entry.allStats.assists += gameStats.assists;
        entry.allStats.steals += gameStats.steals;
        entry.allStats.blocks += gameStats.blocks;
      }

      entry.games.push({
        gameId: player.gameId,
        gameName: player.gameName || player.gameTitle || 'Game',
        grade: grade || 0,
        date: player.gameDate?.toISOString() || '',
        stats: gameStats,
      });

      // Aggregate strengths - handle both array and object formats
      const strengths = player.strengths as any;
      if (Array.isArray(strengths)) {
        for (const s of strengths) {
          const text = typeof s === 'string' ? s : s?.description || s?.strength;
          if (text && !entry.allStrengths.includes(text)) {
            entry.allStrengths.push(text);
          }
        }
      } else if (strengths && typeof strengths === 'object') {
        // New format: { howToGuard, howToAttack, primaryMoves, etc. }
        if (strengths.howToGuard && !entry.allStrengths.includes(strengths.howToGuard)) {
          entry.allStrengths.push(`How to Guard: ${strengths.howToGuard}`);
        }
        if (strengths.howToAttack && !entry.allStrengths.includes(strengths.howToAttack)) {
          entry.allStrengths.push(`How to Attack: ${strengths.howToAttack}`);
        }
      }

      // Aggregate development areas
      const devAreas = player.developmentAreas as any;
      if (Array.isArray(devAreas)) {
        for (const area of devAreas) {
          const areaText = typeof area === 'string' ? area : area?.area || area?.description;
          if (areaText) {
            const normalized = normalizeDevArea(areaText);
            if (normalized && !entry.allDevAreas.includes(normalized)) {
              entry.allDevAreas.push(normalized);
            }
          }
        }
      }

      // Extract from tendencies if no devAreas (only add Defense, skip hand suggestions)
      const tendencies = player.tendencies as any;
      if (tendencies && entry.allDevAreas.length === 0) {
        // Use defensiveRating to infer focus areas
        if (tendencies.defensiveRating === 'average' || tendencies.defensiveRating === 'below average') {
          if (!entry.allDevAreas.includes('Defense')) {
            entry.allDevAreas.push('Defense');
          }
        }
      }

      // Use most recent data
      if (player.displayName && !entry.displayName) {
        entry.displayName = player.displayName;
      }
      if (player.positionGuess && !entry.positionGuess) {
        entry.positionGuess = player.positionGuess;
      }
      if (player.summary && !entry.latestSummary) {
        entry.latestSummary = player.summary;
      }
      if (player.tendencies && !entry.latestTendencies) {
        entry.latestTendencies = player.tendencies;
      }

      // Add key moments
      const moments = momentsByPlayer.get(player.id) || [];
      entry.keyMoments.push(...moments);
    }

    // Convert to array and calculate trends
    const players = Array.from(playerMap.values()).map((player) => {
      const avgGrade = player.grades.length > 0
        ? player.grades.reduce((a, b) => a + b, 0) / player.grades.length
        : null;

      // Calculate trend (last 2 games vs previous 2)
      let trend: 'up' | 'down' | 'stable' | null = null;
      let trendValue = 0;
      if (player.grades.length >= 2) {
        const recent = player.grades.slice(0, 2);
        const previous = player.grades.slice(2, 4);
        if (previous.length > 0) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
          trendValue = recentAvg - prevAvg;
          if (trendValue > 3) trend = 'up';
          else if (trendValue < -3) trend = 'down';
          else trend = 'stable';
        }
      }

      // Calculate per-game averages
      const gamesPlayed = player.games.length;
      const avgStats = {
        ppg: gamesPlayed > 0 ? player.allStats.points / gamesPlayed : 0,
        rpg: gamesPlayed > 0 ? player.allStats.rebounds / gamesPlayed : 0,
        apg: gamesPlayed > 0 ? player.allStats.assists / gamesPlayed : 0,
        spg: gamesPlayed > 0 ? player.allStats.steals / gamesPlayed : 0,
        bpg: gamesPlayed > 0 ? player.allStats.blocks / gamesPlayed : 0,
      };

      return {
        id: player.id,
        jerseyNumber: player.jerseyNumber,
        displayName: player.displayName,
        positionGuess: player.positionGuess,
        teamName: player.teamName,
        overallGrade: player.grades[0] || null,
        gamesPlayed,
        avgGrade,
        trend,
        trendValue,
        recentGames: player.games.slice(0, 10),
        totalStats: player.allStats,
        avgStats,
        strengths: player.allStrengths.slice(0, 5),
        developmentAreas: player.allDevAreas.slice(0, 5),
        summary: player.latestSummary,
        tendencies: player.latestTendencies,
        keyMoments: player.keyMoments.slice(0, 10).map((m) => ({
          description: m.description,
          sentiment: m.sentiment,
          momentType: m.momentType,
          timestamp: m.timestampSeconds
            ? `${Math.floor(parseFloat(m.timestampSeconds) / 60)}:${String(Math.floor(parseFloat(m.timestampSeconds) % 60)).padStart(2, '0')}`
            : null,
        })),
      };
    });

    // Sort by average grade descending
    players.sort((a, b) => (b.avgGrade || 0) - (a.avgGrade || 0));

    // Calculate team-wide development focus areas
    const devAreaCounts = new Map<string, number>();
    for (const player of players) {
      for (const area of player.developmentAreas) {
        devAreaCounts.set(area, (devAreaCounts.get(area) || 0) + 1);
      }
    }
    const teamFocusAreas = Array.from(devAreaCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([area, count]) => ({ area, playerCount: count }));

    // Get unique positions for filtering
    const positions = [...new Set(players.map((p) => p.positionGuess).filter(Boolean))];

    return NextResponse.json({
      players,
      teamFocusAreas,
      positions,
      summary: {
        totalPlayers: players.length,
        avgTeamGrade: players.filter((p) => p.avgGrade !== null).length > 0
          ? players.reduce((sum, p) => sum + (p.avgGrade || 0), 0) /
            players.filter((p) => p.avgGrade !== null).length
          : 0,
        topPerformer: players[0] || null,
        mostImproved: players.filter((p) => p.trend === 'up').sort((a, b) => b.trendValue - a.trendValue)[0] || null,
      },
    });
  } catch (error) {
    console.error('Players API error:', error);
    return NextResponse.json({ players: [], teamFocusAreas: [], positions: [], summary: {} });
  }
}
