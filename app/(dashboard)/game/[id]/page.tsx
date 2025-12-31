'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  Video,
  Users,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Play,
  TrendingUp,
  Target,
  Flag,
  Film,
  Sparkles,
  X,
  Star,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayerModal } from '@/components/video-player';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

// Helper to get color for skill grades (supports both A-F and elite/above-average formats)
function getGradeColor(grade: string): string {
  const g = grade?.toUpperCase();
  if (g === 'A' || g === 'A+' || grade === 'elite') return 'text-green-600';
  if (g === 'B' || g === 'B+' || grade === 'above-average') return 'text-blue-600';
  if (g === 'C' || g === 'C+' || grade === 'average') return 'text-yellow-600';
  if (g === 'D' || grade === 'below-average') return 'text-orange-600';
  if (g === 'F' || grade === 'poor') return 'text-red-600';
  return 'text-gray-600';
}

// Convert game clock time to approximate video elapsed time
// Game clock shows time REMAINING (e.g., "Q1 4:44" = 4:44 left in Q1)
// Video time is time ELAPSED from start
// Assumes 8-minute quarters (high school basketball)
const QUARTER_LENGTH = 8 * 60; // 8 minutes in seconds

function parseTimestamp(ts: string, quarter?: number): number | null {
  if (!ts) return null;

  // Check for quarter format like "Q1 4:44" or "Q2 5:50"
  const quarterMatch = ts.match(/Q(\d)\s+(\d+):(\d+)/i);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1]);
    const mins = parseInt(quarterMatch[2]);
    const secs = parseInt(quarterMatch[3]);
    const clockRemaining = mins * 60 + secs;

    // Calculate elapsed time: (completed quarters * quarter length) + (quarter length - remaining)
    const completedQuarters = q - 1;
    const elapsedInCurrentQuarter = QUARTER_LENGTH - clockRemaining;
    return (completedQuarters * QUARTER_LENGTH) + elapsedInCurrentQuarter;
  }

  // Handle range format like "7:09-4:44" (take the first time as game clock remaining)
  let timeStr = ts;
  if (timeStr.includes('-')) {
    timeStr = timeStr.split('-')[0].trim();
  }

  // Parse the time
  const parts = timeStr.split(':').map(Number);
  if (parts.some(isNaN)) return null;

  // If quarter is provided, convert game clock to video time
  if (quarter && parts.length === 2) {
    const clockRemaining = parts[0] * 60 + parts[1];
    const completedQuarters = quarter - 1;
    const elapsedInCurrentQuarter = QUARTER_LENGTH - clockRemaining;
    return (completedQuarters * QUARTER_LENGTH) + elapsedInCurrentQuarter;
  }

  // Otherwise treat as video elapsed time
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

// Format seconds to MM:SS or HH:MM:SS
function formatTime(seconds: number | null): string {
  if (seconds === null) return '--:--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Parse box score to extract team names and final scores
function parseBoxScore(boxScore: string | null): {
  homeTeam: { name: string; score: number } | null;
  awayTeam: { name: string; score: number } | null;
  quarterScores: { team: string; q1: number; q2: number; q3: number; q4: number; final: number }[];
} {
  if (!boxScore) return { homeTeam: null, awayTeam: null, quarterScores: [] };

  const teams: { name: string; score: number }[] = [];
  const quarterScores: { team: string; q1: number; q2: number; q3: number; q4: number; final: number }[] = [];

  // Match team names with scores like "PROLIFIC PREP (72)" or "MONTVERDE ACADEMY (78)"
  const teamMatches = boxScore.matchAll(/([A-Z][A-Z\s]+)\s*\((\d+)\)/g);
  for (const match of teamMatches) {
    teams.push({ name: match[1].trim(), score: parseInt(match[2]) });
  }

  // Parse score by quarter table
  // Find all team quarter scores using global regex (handles both separate lines and concatenated)
  // Match the line(s) after "Final" until we hit a blank line or "Game Notes"
  const quarterSection = boxScore.match(/Score By Quarter[\s\S]*?Final([\s\S]*?)(?:\n\n|Game Notes|$)/);
  if (quarterSection) {
    const scoresLine = quarterSection[1]; // Everything after "Final" until break
    // Match pattern: TeamName (2+ chars, starting with capital) + 8-10 digits for quarters
    const allMatches = scoresLine.matchAll(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(\d{1,2})(\d{2})(\d{2})(\d{2})(\d{2,3})/g);
    for (const qMatch of allMatches) {
      quarterScores.push({
        team: qMatch[1].trim(),
        q1: parseInt(qMatch[2]),
        q2: parseInt(qMatch[3]),
        q3: parseInt(qMatch[4]),
        q4: parseInt(qMatch[5]),
        final: parseInt(qMatch[6])
      });
    }
  }

  return {
    homeTeam: teams[1] || null, // Second team listed is usually home
    awayTeam: teams[0] || null, // First team listed is usually away
    quarterScores
  };
}

// Check if analysis is complete based on detected players in database
function isAnalysisComplete(game: any): boolean {
  if (!game) return false;
  // Check if we have detected players in the database (the official source)
  const totalPlayers = game.detectedTeams?.reduce(
    (sum: number, team: any) => sum + (team.players?.length || 0),
    0
  ) || 0;
  return totalPlayers > 0;
}

// Player Detail Modal Component
function PlayerDetailModal({ player, teamName, isOpen, onClose }: { player: any; teamName?: string; isOpen: boolean; onClose: () => void }) {
  if (!isOpen || !player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`sticky top-0 z-10 p-6 border-b ${player.team?.toLowerCase() === 'home' ? 'bg-blue-600' : 'bg-orange-500'}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-2xl">
              #{player.jerseyNumber}
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">
                {player.name || player.playerName || `Player #${player.jerseyNumber}`}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-white/80">
                <span>{player.position || player.estimatedPosition || 'Player'}</span>
                <span>•</span>
                <span>{teamName || (player.team?.toLowerCase() === 'home' ? 'Home Team' : 'Away Team')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overall Assessment */}
          {player.overallAssessment && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Overall Assessment</h3>
              <p className="text-gray-700 dark:text-gray-300">{player.overallAssessment}</p>
            </div>
          )}

          {/* Physical Profile */}
          {player.physicalProfile && (
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4">
              <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Physical Profile</h3>
              <p className="text-purple-800 dark:text-purple-400">{player.physicalProfile}</p>
            </div>
          )}

          {/* Key Ratings */}
          <div className="grid grid-cols-3 gap-3">
            {player.basketballIQ && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-indigo-900 dark:text-indigo-300 capitalize">{player.basketballIQ}</div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400">Basketball IQ</div>
              </div>
            )}
            {player.defensiveRating && (
              <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-red-900 dark:text-red-300 capitalize">{player.defensiveRating}</div>
                <div className="text-xs text-red-600 dark:text-red-400">Defense</div>
              </div>
            )}
            {player.motor && (
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-green-900 dark:text-green-300 capitalize">{player.motor}</div>
                <div className="text-xs text-green-600 dark:text-green-400">Motor/Effort</div>
              </div>
            )}
          </div>

          {/* Offensive Skills */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Offensive Game</h3>
            <div className="space-y-3">
              {player.preferredHand && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-400">Preferred Hand</span>
                  <span className="font-medium text-blue-900 dark:text-blue-200 capitalize">{player.preferredHand}</span>
                </div>
              )}

              {/* Shooting Ability */}
              {player.shootingAbility && (
                <div className="space-y-2">
                  <div className="text-sm text-blue-700 dark:text-blue-400 font-medium">Shooting</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {player.shootingAbility.range && (
                      <div className="bg-blue-100 dark:bg-blue-800/50 rounded-lg p-2">
                        <div className="text-blue-600 dark:text-blue-400">Range</div>
                        <div className="font-medium text-blue-900 dark:text-blue-200">{player.shootingAbility.range}</div>
                      </div>
                    )}
                    {player.shootingAbility.form && (
                      <div className="bg-blue-100 dark:bg-blue-800/50 rounded-lg p-2">
                        <div className="text-blue-600 dark:text-blue-400">Form</div>
                        <div className="font-medium text-blue-900 dark:text-blue-200">{player.shootingAbility.form}</div>
                      </div>
                    )}
                    {player.shootingAbility.offDribble && (
                      <div className="bg-blue-100 dark:bg-blue-800/50 rounded-lg p-2">
                        <div className="text-blue-600 dark:text-blue-400">Off Dribble</div>
                        <div className="font-medium text-blue-900 dark:text-blue-200">{player.shootingAbility.offDribble}</div>
                      </div>
                    )}
                    {player.shootingAbility.catchAndShoot && (
                      <div className="bg-blue-100 dark:bg-blue-800/50 rounded-lg p-2">
                        <div className="text-blue-600 dark:text-blue-400">Catch & Shoot</div>
                        <div className="font-medium text-blue-900 dark:text-blue-200">{player.shootingAbility.catchAndShoot}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Primary Moves */}
              {player.primaryMoves && player.primaryMoves.length > 0 && (
                <div>
                  <div className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-2">Primary Moves</div>
                  <div className="flex flex-wrap gap-2">
                    {player.primaryMoves.map((move: string, i: number) => (
                      <span key={i} className="bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">{move}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scouting Advice - How to Guard */}
          {player.howToGuard && (
            <div className="bg-red-100 dark:bg-red-900/30 rounded-xl p-4">
              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                How to Guard This Player
              </h4>
              <p className="text-red-900 dark:text-red-400">{player.howToGuard}</p>
            </div>
          )}

          {/* Scouting Advice - How to Attack */}
          {player.howToAttack && (
            <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-4">
              <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                How to Attack This Player
              </h4>
              <p className="text-green-900 dark:text-green-400">{player.howToAttack}</p>
            </div>
          )}

          {/* Legacy fields for backwards compatibility */}
          {player.offensiveTendencies?.keyTendency && (
            <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-xl p-4">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Key Tendency</h4>
              <p className="text-yellow-900 dark:text-yellow-400">{player.offensiveTendencies.keyTendency}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  uploading: { label: 'Uploading', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  queued: { label: 'Queued for Processing', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  detecting: { label: 'Detecting Players', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  tracking: { label: 'Tracking Movement', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  analyzing: { label: 'Generating Reports', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ready: { label: 'Analysis Complete', color: 'text-green-600', bgColor: 'bg-green-50' },
  failed: { label: 'Processing Failed', color: 'text-red-600', bgColor: 'bg-red-50' },
};

function PlayerCard({ player, gameId, onFlag, onMomentClick, geminiPlayerData }: { player: any; gameId: string; onFlag?: (playerId: string) => void; onMomentClick?: (time: number) => void; geminiPlayerData?: any }) {
  const analysis = player.analysis;
  const grade = analysis?.overallGrade ? parseFloat(analysis.overallGrade) : null;
  const [flagged, setFlagged] = useState(false);

  // Get box score from either playerAnalysis.metrics or geminiPlayerData
  const boxScore = analysis?.metrics?.boxScore || geminiPlayerData?.boxScore || {};
  const hasStats = boxScore.points != null || boxScore.rebounds != null || boxScore.assists != null;

  async function handleFlag(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch('/api/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'player',
          targetId: player.id,
          reason: 'Coach flagged for review',
        }),
      });
      if (res.ok) {
        setFlagged(true);
        onFlag?.(player.id);
      }
    } catch (error) {
      console.error('Failed to flag:', error);
    }
  }

  return (
    <Link href={`/game/${gameId}/player/${player.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer relative group">
        {/* Flag Button */}
        <button
          onClick={handleFlag}
          className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors ${
            flagged
              ? 'bg-orange-100 text-orange-600'
              : 'bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-orange-100 hover:text-orange-600'
          }`}
          title={flagged ? 'Flagged for review' : 'Flag for review'}
        >
          <Flag className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {player.thumbnailUrl ? (
              <img
                src={player.thumbnailUrl}
                alt={player.displayName}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">{player.displayName || `#${player.jerseyNumber}`}</h4>
              {player.positionGuess && (
                <p className="text-sm text-gray-500">{player.positionGuess}</p>
              )}
            </div>
          </div>
          {grade !== null && (
            <div className="text-right mr-6">
              <div className={`text-2xl font-bold ${grade >= 80 ? 'text-green-600' : grade >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {grade.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">Grade</div>
            </div>
          )}
        </div>

        {/* Box Score Stats */}
        {hasStats && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-5 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{boxScore.points ?? '-'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">PTS</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{boxScore.totalRebounds ?? boxScore.rebounds ?? '-'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">REB</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{boxScore.assists ?? '-'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">AST</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{boxScore.steals ?? '-'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">STL</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{boxScore.blocks ?? '-'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">BLK</div>
              </div>
            </div>
            {/* Shooting Splits */}
            {(boxScore.fieldGoalsMade != null || boxScore.threePointersMade != null) && (
              <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {boxScore.fieldGoalsMade != null && boxScore.fieldGoalsAttempted != null && (
                  <span>FG: {boxScore.fieldGoalsMade}/{boxScore.fieldGoalsAttempted}</span>
                )}
                {boxScore.threePointersMade != null && boxScore.threePointersAttempted != null && (
                  <span>3P: {boxScore.threePointersMade}/{boxScore.threePointersAttempted}</span>
                )}
                {boxScore.freeThrowsMade != null && boxScore.freeThrowsAttempted != null && (
                  <span>FT: {boxScore.freeThrowsMade}/{boxScore.freeThrowsAttempted}</span>
                )}
              </div>
            )}
          </div>
        )}

        {analysis?.summary && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{analysis.summary}</p>
        )}

        {/* Key Moments */}
        {player.keyMoments && player.keyMoments.length > 0 && onMomentClick && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Key Moments</p>
            <div className="flex flex-wrap gap-1">
              {player.keyMoments.slice(0, 3).map((moment: any) => {
                const time = moment.timestampSeconds ? parseFloat(moment.timestampSeconds) : null;
                return (
                  <button
                    key={moment.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (time !== null) onMomentClick(time);
                    }}
                    className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                      moment.sentiment === 'positive'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : moment.sentiment === 'negative'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    {moment.momentType || 'View'}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function TeamReportCard({ team, sport }: { team: any; sport: string }) {
  const analysis = team.analysis;

  // Parse breakdowns
  const formationBreakdown = analysis?.formationBreakdown || {};
  const playTypeBreakdown = analysis?.playTypeBreakdown || {};
  const tendencies = analysis?.tendencies || {};

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        {team.primaryJerseyColor && (
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600"
            style={{ backgroundColor: team.primaryJerseyColor }}
          />
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {team.teamName || team.teamLabel || 'Team'}
          </h3>
          {team.isUserTeam && (
            <span className="text-xs bg-[#0f2d52] text-white px-2 py-0.5 rounded-full">Your Team</span>
          )}
        </div>
      </div>

      {/* Tendencies Report */}
      {analysis?.tendenciesReport && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendencies Analysis
          </h4>
          <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            {analysis.tendenciesReport}
          </p>
        </div>
      )}

      {/* Formation Breakdown */}
      {Object.keys(formationBreakdown).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Formation Usage
          </h4>
          <div className="space-y-2">
            {Object.entries(formationBreakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([formation, percentage]) => (
                <div key={formation} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 dark:text-gray-400 truncate">{formation}</div>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0f2d52] dark:bg-blue-500 rounded-full"
                      style={{ width: `${percentage as number}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-gray-500 dark:text-gray-400 text-right">{percentage as number}%</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Play Type Breakdown */}
      {Object.keys(playTypeBreakdown).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Play Type Distribution
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(playTypeBreakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([playType, count]) => (
                <div key={playType} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{count as number}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{playType.replace(/_/g, ' ')}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Key Tendencies */}
      {Object.keys(tendencies).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Key Tendencies</h4>
          <ul className="space-y-2">
            {Object.entries(tendencies).slice(0, 5).map(([key, value]) => (
              <li key={key} className="flex items-start gap-2 text-sm">
                <span className="text-[#0f2d52] dark:text-blue-400 mt-0.5">•</span>
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Offensive/Defensive Metrics */}
      {(analysis?.offensiveMetrics || analysis?.defensiveMetrics) && (
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            {analysis?.offensiveMetrics && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Offense</h5>
                <div className="space-y-1">
                  {Object.entries(analysis.offensiveMetrics).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {analysis?.defensiveMetrics && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Defense</h5>
                <div className="space-y-1">
                  {Object.entries(analysis.defensiveMetrics).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No analysis state */}
      {!analysis && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>Team analysis not yet available</p>
        </div>
      )}
    </div>
  );
}

function ScoutingPlayerCard({ player, teamName, onClick }: { player: any; teamName?: string; onClick?: () => void }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg ${
            player.team?.toLowerCase() === 'home' ? 'bg-blue-600' : 'bg-orange-500'
          }`}>
            #{player.jerseyNumber}
          </div>
          <div>
            {/* Player Name - from box score or jersey number */}
            <div className="font-bold text-gray-900 dark:text-white">
              {player.name || player.playerName || `#${player.jerseyNumber}`}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">{player.estimatedPosition || player.position || 'Player'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                player.team?.toLowerCase() === 'home' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
              }`}>
                {teamName || (player.team?.toLowerCase() === 'home' ? 'Home' : 'Away')}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      {/* Overall Assessment */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
        {player.overallAssessment}
      </p>

      {/* Tendencies Grid - handles both nested and flat formats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Offensive Tendencies */}
        <div>
          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Offense</h5>
          <div className="space-y-1 text-xs">
            {(player.offensiveTendencies?.preferredHand || player.preferredHand) && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Hand</span>
                <span className="font-medium text-gray-700 dark:text-gray-200 capitalize">{player.offensiveTendencies?.preferredHand || player.preferredHand}</span>
              </div>
            )}
            {player.offensiveTendencies?.shootingRange && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Range</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{player.offensiveTendencies.shootingRange}</span>
              </div>
            )}
            {player.offensiveTendencies?.ballHandling && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Handles</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{player.offensiveTendencies.ballHandling}</span>
              </div>
            )}
          </div>
          {(player.offensiveTendencies?.primaryMoves?.length > 0 || player.primaryMoves?.length > 0) && (
            <div className="mt-2">
              <span className="text-xs text-gray-400">Moves:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(player.offensiveTendencies?.primaryMoves || player.primaryMoves || []).slice(0, 3).map((move: string, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">{move}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Defensive Tendencies */}
        <div>
          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Defense</h5>
          <div className="space-y-1 text-xs">
            {(player.defensiveTendencies?.onBallDefense || player.defensiveRating) && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Rating</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{player.defensiveTendencies?.onBallDefense || player.defensiveRating}</span>
              </div>
            )}
            {player.defensiveTendencies?.helpDefense && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Help</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{player.defensiveTendencies.helpDefense}</span>
              </div>
            )}
            {player.defensiveTendencies?.effort && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Motor</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{player.defensiveTendencies.effort}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Athletic Profile */}
      {player.athleticProfile && (
        <div className="mb-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Athletic Profile</h5>
          <div className="flex gap-4 text-xs">
            {player.athleticProfile.speed && (
              <div className="text-center">
                <div className="font-medium text-gray-700 dark:text-gray-200">{player.athleticProfile.speed}</div>
                <div className="text-gray-400">Speed</div>
              </div>
            )}
            {player.athleticProfile.strength && (
              <div className="text-center">
                <div className="font-medium text-gray-700 dark:text-gray-200">{player.athleticProfile.strength}</div>
                <div className="text-gray-400">Strength</div>
              </div>
            )}
            {player.athleticProfile.explosiveness && (
              <div className="text-center">
                <div className="font-medium text-gray-700 dark:text-gray-200">{player.athleticProfile.explosiveness}</div>
                <div className="text-gray-400">Explosiveness</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scouting Advice - handles both nested and flat formats */}
      {(player.scoutingAdvice || player.howToGuard || player.howToAttack) && (
        <div className="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
          {(player.scoutingAdvice?.howToGuard || player.howToGuard) && (
            <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
              <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">How to Guard</div>
              <p className="text-xs text-red-800 dark:text-red-300">{player.scoutingAdvice?.howToGuard || player.howToGuard}</p>
            </div>
          )}
          {(player.scoutingAdvice?.howToAttack || player.howToAttack) && (
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
              <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">How to Attack</div>
              <p className="text-xs text-green-800 dark:text-green-300">{player.scoutingAdvice?.howToAttack || player.howToAttack}</p>
            </div>
          )}
        </div>
      )}

      {/* Key Tendency Highlight */}
      {player.offensiveTendencies?.keyTendency && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-100 dark:border-yellow-800">
          <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Key Tendency</div>
          <p className="text-xs text-yellow-800 dark:text-yellow-300">{player.offensiveTendencies.keyTendency}</p>
        </div>
      )}
    </div>
  );
}

// Helper to safely render tendency items (can be string or object)
function renderTendency(t: any): string {
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object') {
    // Handle weakness format: {weakness, howToExploit}
    if (t.weakness) {
      return t.howToExploit ? `${t.weakness} → ${t.howToExploit}` : t.weakness;
    }
    // Handle object format: {notes, action, frequency, timestamp}
    if (t.action) return `${t.action}${t.frequency ? ` (${t.frequency})` : ''}${t.notes ? ` - ${t.notes}` : ''}`;
    if (t.notes) return t.notes;
    if (t.tendency) return t.tendency;
    if (t.description) return t.description;
    // Fallback: try to stringify first available string value
    for (const key of ['name', 'text', 'value', 'label']) {
      if (typeof t[key] === 'string') return t[key];
    }
  }
  return String(t);
}

function TeamScoutingCard({ team, teamLabel, teamName }: { team: any; teamLabel: 'home' | 'away'; teamName?: string }) {
  if (!team) return null;

  const accentColor = teamLabel === 'home' ? 'blue' : 'orange';
  const bgClass = teamLabel === 'home' ? 'bg-blue-50' : 'bg-orange-50';
  const borderClass = teamLabel === 'home' ? 'border-blue-200' : 'border-orange-200';
  const iconBg = teamLabel === 'home' ? 'bg-blue-100' : 'bg-orange-100';
  const iconText = teamLabel === 'home' ? 'text-blue-600' : 'text-orange-600';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-6 ${borderClass}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBg}`}>
          <Users className={`w-6 h-6 ${iconText}`} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{teamName || (teamLabel === 'home' ? 'Home Team' : 'Away Team')}</h3>
          {team.jerseyColor && (
            <div className="text-sm text-gray-500 dark:text-gray-400">Jersey: {team.jerseyColor}</div>
          )}
        </div>
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${bgClass} dark:bg-gray-700`}>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Offense</div>
          <div className="font-bold text-gray-900 dark:text-white text-sm">{team.offensiveSystem || 'Not analyzed'}</div>
          {team.transitionStyle && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Transition: {team.transitionStyle}</div>
          )}
          {team.spacing?.formation && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Spacing: {team.spacing.formation}</div>
          )}
        </div>
        <div className={`p-4 rounded-lg ${bgClass} dark:bg-gray-700`}>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Defense</div>
          <div className="font-bold text-gray-900 dark:text-white text-sm">{team.defensiveSystem || 'Not analyzed'}</div>
          {team.pnrCoverage && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              PnR: {typeof team.pnrCoverage === 'string' ? team.pnrCoverage : team.pnrCoverage.primary || 'N/A'}
            </div>
          )}
        </div>
      </div>

      {/* Key Players */}
      {(team.keyOffensivePlayers?.length > 0 || team.keyDefenders?.length > 0) && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            Key Players
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {team.keyOffensivePlayers?.slice(0, 3).map((p: any, i: number) => (
              <div key={`off-${i}`} className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-green-700 dark:text-green-400">#{p.jersey || '?'}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded">Offense</span>
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300">{p.role || p.tendency}</div>
                {p.threat && <div className="text-xs text-green-600 dark:text-green-400 mt-1">Threat: {p.threat}</div>}
              </div>
            ))}
            {team.keyDefenders?.slice(0, 3).map((p: any, i: number) => (
              <div key={`def-${i}`} className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">#{p.jersey || '?'}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded">Defense</span>
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300">{p.role || p.strength}</div>
                {p.assignment && <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Guards: {p.assignment}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offensive Tendencies */}
      {team.offensiveTendencies?.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Offensive Tendencies
          </h4>
          <ul className="space-y-2">
            {team.offensiveTendencies.slice(0, 5).map((t: any, i: number) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>{renderTendency(t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Defensive Tendencies */}
      {team.defensiveTendencies?.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            Defensive Tendencies
          </h4>
          <ul className="space-y-2">
            {team.defensiveTendencies.slice(0, 5).map((t: any, i: number) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>{renderTendency(t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses - Offensive */}
      {(team.offensiveWeaknesses?.length > 0 || team.weaknesses?.length > 0) && (
        <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 border border-red-100 dark:border-red-800 mb-4">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Offensive Weaknesses to Exploit
          </h4>
          <ul className="space-y-2">
            {(team.offensiveWeaknesses || team.weaknesses || []).slice(0, 4).map((w: any, i: number) => (
              <li key={i} className="text-sm text-red-800 dark:text-red-300 flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>{renderTendency(w)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Defensive Weaknesses */}
      {team.defensiveWeaknesses?.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 border border-amber-100 dark:border-amber-800">
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Defensive Weaknesses to Attack
          </h4>
          <ul className="space-y-2">
            {team.defensiveWeaknesses.slice(0, 4).map((w: any, i: number) => (
              <li key={i} className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>{renderTendency(w)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GeminiInsights({ game }: { game: any }) {
  const analysis = game?.geminiAnalysis;
  if (!analysis) return null;

  const boxScore = game?.boxScore as string;
  const allPlayers = game?.detectedTeams?.flatMap((team: any) => team.players || []) || [];
  const gameInfo = analysis.gameInfo;
  const coachingInsights = analysis.coachingInsights;
  const boxScoreData = parseBoxScore(boxScore || null);
  const gameFlow = analysis.gameFlow;
  const teamAnalysisData = analysis.teamAnalysis;
  const coachReport = analysis.coachReport;
  const scoring = analysis.scoring;
  const stats = analysis.stats;

  // New scouting format
  const teamScouting = analysis.teamScouting;
  const playerScouting = analysis.playerScouting;
  const homeTeamName = analysis.homeTeamName;
  const awayTeamName = analysis.awayTeamName;

  // Create a map of player metrics from database by "team:jersey" key
  // This handles cases where both teams have the same jersey number (e.g., two #3 players)
  const playerMetricsMap = new Map<string, any>();
  for (const team of game?.detectedTeams || []) {
    const teamLabel = team.teamLabel; // 'home' or 'away'
    for (const player of team.players || []) {
      if (player.jerseyNumber && player.analysis?.metrics) {
        // Key includes team to differentiate same jersey numbers on different teams
        playerMetricsMap.set(`${teamLabel}:${player.jerseyNumber}`, player.analysis.metrics);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Summary - Combined overview stats, teams, and game narrative */}
      {coachingInsights?.gameNarrative && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Summary
          </h3>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center border border-gray-100 dark:border-gray-600">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {game.geminiAnalysis?.playerScouting?.players?.length || allPlayers.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Players Scouted</div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center border border-gray-100 dark:border-gray-600">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {(() => {
                  const boxScore = game.boxScore as string || '';
                  const totalsMatches = [...boxScore.matchAll(/TOTALS(\d{1,2})-(\d{2})/g)].slice(0, 2);
                  let totalFGA = 0;
                  for (const match of totalsMatches) {
                    totalFGA += parseInt(match[2]) || 0;
                  }
                  return totalFGA || game.detectedPlays?.length || '-';
                })()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Shots</div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center border border-gray-100 dark:border-gray-600">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {coachingInsights?.keyMoments?.length || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Key Moments</div>
            </div>
            {game.videoDurationSeconds && (
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center border border-gray-100 dark:border-gray-600">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(game.videoDurationSeconds / 60)}:{(game.videoDurationSeconds % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
              </div>
            )}
          </div>

          {/* Teams Row */}
          <div className="flex flex-wrap gap-3 mb-4">
            {game.geminiAnalysis?.teamScouting ? (
              <>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg px-4 py-2 border border-gray-100 dark:border-gray-600">
                  <div className="w-4 h-4 rounded-full bg-blue-600" />
                  <span className="font-medium text-gray-900 dark:text-white">{game.geminiAnalysis.homeTeamName || 'Home'}</span>
                  <span className="text-xs bg-[#0f2d52] text-white px-2 py-0.5 rounded-full">Your Team</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {game.geminiAnalysis.playerScouting?.players?.filter((p: any) => p.team?.toLowerCase() === 'home').length || 0} players
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg px-4 py-2 border border-gray-100 dark:border-gray-600">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span className="font-medium text-gray-900 dark:text-white">{game.geminiAnalysis.awayTeamName || 'Away'}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {game.geminiAnalysis.playerScouting?.players?.filter((p: any) => p.team?.toLowerCase() === 'away').length || 0} players
                  </span>
                </div>
              </>
            ) : (
              game.detectedTeams?.map((team: any) => (
                <div key={team.id} className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg px-4 py-2 border border-gray-100 dark:border-gray-600">
                  {team.primaryJerseyColor && (
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.primaryJerseyColor }} />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">{team.teamName || team.teamLabel || 'Team'}</span>
                  {team.isUserTeam && (
                    <span className="text-xs bg-[#0f2d52] text-white px-2 py-0.5 rounded-full">Your Team</span>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">{team.players?.length || 0} players</span>
                </div>
              ))
            )}
          </div>

          {/* Accurate Final Score from Box Score */}
          {boxScoreData.homeTeam && boxScoreData.awayTeam && (
            <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 text-center">Final Score</p>

              {/* Scoreboard Table */}
              <table className="w-full text-center">
                <thead>
                  <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <th className="text-left py-1 px-2">Team</th>
                    <th className="py-1 px-2 w-12">Q1</th>
                    <th className="py-1 px-2 w-12">Q2</th>
                    <th className="py-1 px-2 w-12">Q3</th>
                    <th className="py-1 px-2 w-12">Q4</th>
                    <th className="py-1 px-3 w-16 bg-gray-100 dark:bg-gray-600 rounded">Final</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {boxScoreData.quarterScores.map((qs, i) => {
                    const isWinner = qs.final === Math.max(...boxScoreData.quarterScores.map(q => q.final));
                    return (
                      <tr key={i} className={isWinner ? 'font-bold' : ''}>
                        <td className="text-left py-2 px-2">
                          <span className={isWinner ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}>
                            {isWinner && '🏆 '}{qs.team}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{qs.q1}</td>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{qs.q2}</td>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{qs.q3}</td>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{qs.q4}</td>
                        <td className={`py-2 px-3 bg-gray-100 dark:bg-gray-600 rounded text-lg ${isWinner ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {qs.final}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">{coachingInsights.gameNarrative}</p>

          {/* Deciding Factors */}
          {coachingInsights.decidingFactors?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Deciding Factors</h4>
              <ul className="space-y-1">
                {coachingInsights.decidingFactors.map((factor: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Moments */}
          {coachingInsights.keyMoments?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Key Moments</h4>
              <div className="space-y-2">
                {coachingInsights.keyMoments.map((moment: any, i: number) => {
                  const seconds = parseTimestamp(moment.timestamp);
                  return (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="font-mono text-xs bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-300 px-2 py-1 rounded">
                        {formatTime(seconds)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">{moment.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW: Game Prep Section */}
      {coachingInsights?.forNextGame && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Next Game Preparation
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Attacking Their Defense */}
            {coachingInsights.forNextGame.attackingTheirDefense?.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <h4 className="text-sm font-semibold text-green-700 mb-2">Attacking Their Defense</h4>
                <ul className="space-y-3">
                  {coachingInsights.forNextGame.attackingTheirDefense.map((item: any, i: number) => (
                    <li key={i} className="text-sm text-green-800">
                      {typeof item === 'string' ? (
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </div>
                      ) : (
                        <div className="bg-green-100/50 rounded-lg p-3">
                          <div className="font-medium text-green-900 mb-1">{item.action}</div>
                          {item.why && <div className="text-xs text-green-700">Why: {item.why}</div>}
                          {item.when && <div className="text-xs text-green-600 mt-1">When: {item.when}</div>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Defending Their Offense */}
            {coachingInsights.forNextGame.defendingTheirOffense?.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <h4 className="text-sm font-semibold text-red-700 mb-2">Defending Their Offense</h4>
                <ul className="space-y-3">
                  {coachingInsights.forNextGame.defendingTheirOffense.map((item: any, i: number) => (
                    <li key={i} className="text-sm text-red-800">
                      {typeof item === 'string' ? (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </div>
                      ) : (
                        <div className="bg-red-100/50 rounded-lg p-3">
                          <div className="font-medium text-red-900 mb-1">{item.adjustment || item.action}</div>
                          {item.why && <div className="text-xs text-red-700">Why: {item.why}</div>}
                          {item.personnel && <div className="text-xs text-red-600 mt-1">Personnel: {item.personnel}</div>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Players to Watch - with threat/counter details */}
          {coachingInsights.forNextGame.playersToWatch?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Players to Watch</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {coachingInsights.forNextGame.playersToWatch.map((p: any, i: number) => (
                  <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-100 dark:border-yellow-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-yellow-800 dark:text-yellow-400">#{p.jersey}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{p.team}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-red-700 dark:text-red-400"><span className="font-semibold">Threat:</span> {p.threat}</p>
                      <p className="text-xs text-green-700 dark:text-green-400"><span className="font-semibold">Counter:</span> {p.counter}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW: Practice Priorities */}
      {coachingInsights?.practicePriorities?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Practice Priorities
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coachingInsights.practicePriorities.map((priority: any, i: number) => (
              <div key={i} className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
                <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">{priority.focus}</h4>
                {priority.drillSuggestion && (
                  <p className="text-sm text-indigo-700 dark:text-indigo-400">{priority.drillSuggestion}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW: Exploitable Tendencies */}
      {coachingInsights?.exploitableTendencies?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            Exploitable Tendencies
          </h3>
          <div className="space-y-4">
            {coachingInsights.exploitableTendencies.map((tendency: any, i: number) => (
              <div key={i} className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4 border border-orange-100 dark:border-orange-800">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">When: <span className="font-medium text-gray-700 dark:text-gray-300">{tendency.situation}</span></div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">They: <span className="font-medium text-gray-700 dark:text-gray-300">{tendency.tendency}</span></div>
                    <div className="text-sm font-semibold text-orange-800 dark:text-orange-400">Counter: {tendency.counter}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy Coach Report (if present) */}
      {coachReport && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Coach's Scouting Report
          </h3>
          <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
            {coachReport.split('\n').map((line: string, i: number) => {
              if (line.startsWith('# ')) {
                return <h1 key={i} className="text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2">{line.replace('# ', '')}</h1>;
              } else if (line.startsWith('## ')) {
                return <h2 key={i} className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">{line.replace('## ', '')}</h2>;
              } else if (line.startsWith('### ')) {
                return <h3 key={i} className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-4 mb-1">{line.replace('### ', '')}</h3>;
              } else if (line.startsWith('- ')) {
                return <li key={i} className="ml-4">{line.replace('- ', '')}</li>;
              } else if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>;
              } else if (line.trim() === '---') {
                return <hr key={i} className="my-4 border-gray-200 dark:border-gray-700" />;
              } else if (line.trim()) {
                return <p key={i} className="mb-2">{line}</p>;
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* Game Info Summary */}
      {gameInfo && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-xl border border-blue-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Analysis Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gameInfo.teams?.home?.name && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Home</p>
                <p className="font-semibold text-gray-900 dark:text-white">{gameInfo.teams.home.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: gameInfo.teams.home.jerseyColor }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{gameInfo.teams.home.jerseyColor}</span>
                </div>
              </div>
            )}
            {gameInfo.teams?.away?.name && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Away</p>
                <p className="font-semibold text-gray-900 dark:text-white">{gameInfo.teams.away.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: gameInfo.teams.away.jerseyColor }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{gameInfo.teams.away.jerseyColor}</span>
                </div>
              </div>
            )}
            {gameInfo.venue && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Venue</p>
                <p className="font-semibold text-gray-900 dark:text-white">{gameInfo.venue}</p>
              </div>
            )}
            {gameInfo.duration && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Duration</p>
                <p className="font-semibold text-gray-900 dark:text-white">{gameInfo.duration}</p>
              </div>
            )}
          </div>
          {gameInfo.finalScore && gameInfo.finalScore.home != null && gameInfo.finalScore.away != null && (
            <div className="mt-4 pt-4 border-t border-blue-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Final Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {gameInfo.teams?.home?.name || 'Home'} {gameInfo.finalScore.home} - {gameInfo.finalScore.away} {gameInfo.teams?.away?.name || 'Away'}
              </p>
            </div>
          )}
        </div>
      )}


      {/* Game Flow */}
      {gameFlow && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Game Flow
          </h3>

          {/* Momentum Swings */}
          {gameFlow.momentumSwings?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Momentum Shifts</p>
              <div className="space-y-2">
                {gameFlow.momentumSwings.map((swing: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-xs text-gray-400 font-mono mt-0.5">{swing.timestamp}</span>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{swing.description}</p>
                      {swing.runScore && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{swing.runScore}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Runs */}
          {gameFlow.runs?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scoring Runs</p>
              <div className="flex flex-wrap gap-2">
                {gameFlow.runs.map((run: any, i: number) => (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      run.team === 'home' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
                    }`}
                  >
                    <span className="font-semibold">{run.points}-0 run</span>
                    <span className="text-xs ml-2 opacity-75">({run.startTime} - {run.endTime})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clutch Performance */}
          {gameFlow.clutchPerformance && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clutch Performance (Final 2 mins)</p>
              <div className="grid grid-cols-2 gap-4">
                {gameFlow.clutchPerformance.finalTwoMinutes?.home && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Home</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{gameFlow.clutchPerformance.finalTwoMinutes.home.points} pts</p>
                  </div>
                )}
                {gameFlow.clutchPerformance.finalTwoMinutes?.away && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Away</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{gameFlow.clutchPerformance.finalTwoMinutes.away.points} pts</p>
                  </div>
                )}
              </div>
              {gameFlow.clutchPerformance.clutchPlayers?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-green-600 dark:text-green-400">Clutch Players: {gameFlow.clutchPerformance.clutchPlayers.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          {/* Turning Points */}
          {gameFlow.turningPoints?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Turning Points</p>
              <ul className="space-y-2">
                {gameFlow.turningPoints.map((tp: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 font-mono text-xs mt-0.5">{tp.timestamp}</span>
                    <span className="text-gray-600 dark:text-gray-400">{tp.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Team Tendencies from Gemini */}
      {teamAnalysisData && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(teamAnalysisData).map(([teamKey, teamData]: [string, any]) => (
            <div key={teamKey} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4 capitalize">{teamKey} Team Analysis</h4>

              {/* Strengths */}
              {teamData.strengths?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Strengths</p>
                  <ul className="space-y-1">
                    {teamData.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {teamData.weaknesses?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Weaknesses</p>
                  <ul className="space-y-1">
                    {teamData.weaknesses.map((w: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Offensive Tendencies */}
              {teamData.offensiveTendencies && (
                <div className="text-sm">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Offensive Tendencies</p>
                  <div className="space-y-1 text-gray-600 dark:text-gray-400">
                    {teamData.offensiveTendencies.transitionFrequency && (
                      <p>Transition: {teamData.offensiveTendencies.transitionFrequency}</p>
                    )}
                    {teamData.offensiveTendencies.ballMovement && (
                      <p>Ball Movement: {teamData.offensiveTendencies.ballMovement}</p>
                    )}
                    {teamData.offensiveTendencies.spacing && (
                      <p>Spacing: {teamData.offensiveTendencies.spacing}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Player Box Score Table - Uses database players with metrics */}
      {game.detectedTeams && game.detectedTeams.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Player Box Scores
          </h3>

          {/* Group by team */}
          {['home', 'away'].map((teamLabel) => {
            const team = game.detectedTeams?.find((t: any) => t.teamLabel === teamLabel);
            const teamPlayers = team?.players || [];
            if (teamPlayers.length === 0) return null;

            const teamName = team?.teamName || (teamLabel === 'home' ? 'Home' : 'Away');
            const teamColor = team?.primaryJerseyColor || (teamLabel === 'home' ? '#0f2d52' : '#dc2626');

            return (
              <div key={teamLabel} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: teamColor }}
                  />
                  <h4 className="font-medium text-gray-700 dark:text-gray-200">{teamName}</h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                        <th className="text-left py-2 px-2 font-medium">#</th>
                        <th className="text-left py-2 px-2 font-medium">POS</th>
                        <th className="text-center py-2 px-2 font-medium">PTS</th>
                        <th className="text-center py-2 px-2 font-medium">REB</th>
                        <th className="text-center py-2 px-2 font-medium">AST</th>
                        <th className="text-center py-2 px-2 font-medium">STL</th>
                        <th className="text-center py-2 px-2 font-medium">BLK</th>
                        <th className="text-center py-2 px-2 font-medium">TO</th>
                        <th className="text-center py-2 px-2 font-medium">FG</th>
                        <th className="text-center py-2 px-2 font-medium">3P</th>
                        <th className="text-center py-2 px-2 font-medium">FT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamPlayers
                        .sort((a: any, b: any) => (b.analysis?.metrics?.points || 0) - (a.analysis?.metrics?.points || 0))
                        .map((player: any, idx: number) => {
                          const bs = player.analysis?.metrics || {};
                          const fgm = bs.fieldGoalsMade;
                          const fga = bs.fieldGoalsAttempted;
                          const tpm = bs.threePointersMade;
                          const tpa = bs.threePointersAttempted;
                          const ftm = bs.freeThrowsMade;
                          const fta = bs.freeThrowsAttempted;

                          return (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100">
                              <td className="py-2 px-2 font-semibold">{player.jerseyNumber || '-'}</td>
                              <td className="py-2 px-2 text-gray-500 dark:text-gray-400">{player.positionGuess || '-'}</td>
                              <td className="py-2 px-2 text-center font-bold">{bs.points ?? '-'}</td>
                              <td className="py-2 px-2 text-center">{bs.rebounds ?? '-'}</td>
                              <td className="py-2 px-2 text-center">{bs.assists ?? '-'}</td>
                              <td className="py-2 px-2 text-center">{bs.steals ?? '-'}</td>
                              <td className="py-2 px-2 text-center">{bs.blocks ?? '-'}</td>
                              <td className="py-2 px-2 text-center">{bs.turnovers ?? '-'}</td>
                              <td className="py-2 px-2 text-center text-gray-600 dark:text-gray-300">
                                {fgm != null && fga != null ? `${fgm}-${fga}` : '-'}
                              </td>
                              <td className="py-2 px-2 text-center text-gray-600 dark:text-gray-300">
                                {tpm != null && tpa != null ? `${tpm}-${tpa}` : '-'}
                              </td>
                              <td className="py-2 px-2 text-center text-gray-600 dark:text-gray-300">
                                {ftm != null && fta != null ? `${ftm}-${fta}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      {(() => {
                        const totals = teamPlayers.reduce((acc: any, player: any) => {
                          const bs = player.analysis?.metrics || {};
                          return {
                            points: (acc.points || 0) + (bs.points || 0),
                            rebounds: (acc.rebounds || 0) + (bs.rebounds || 0),
                            assists: (acc.assists || 0) + (bs.assists || 0),
                            steals: (acc.steals || 0) + (bs.steals || 0),
                            blocks: (acc.blocks || 0) + (bs.blocks || 0),
                            turnovers: (acc.turnovers || 0) + (bs.turnovers || 0),
                            fgm: (acc.fgm || 0) + (bs.fieldGoalsMade || 0),
                            fga: (acc.fga || 0) + (bs.fieldGoalsAttempted || 0),
                            tpm: (acc.tpm || 0) + (bs.threePointersMade || 0),
                            tpa: (acc.tpa || 0) + (bs.threePointersAttempted || 0),
                            ftm: (acc.ftm || 0) + (bs.freeThrowsMade || 0),
                            fta: (acc.fta || 0) + (bs.freeThrowsAttempted || 0),
                          };
                        }, {});
                        return (
                          <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white">
                            <td className="py-2 px-2" colSpan={2}>TOTAL</td>
                            <td className="py-2 px-2 text-center font-bold">{totals.points}</td>
                            <td className="py-2 px-2 text-center">{totals.rebounds}</td>
                            <td className="py-2 px-2 text-center">{totals.assists}</td>
                            <td className="py-2 px-2 text-center">{totals.steals}</td>
                            <td className="py-2 px-2 text-center">{totals.blocks}</td>
                            <td className="py-2 px-2 text-center">{totals.turnovers}</td>
                            <td className="py-2 px-2 text-center text-gray-600 dark:text-gray-300">
                              {totals.fgm}-{totals.fga}
                            </td>
                            <td className="py-2 px-2 text-center text-gray-600 dark:text-gray-300">
                              {totals.tpm}-{totals.tpa}
                            </td>
                            <td className="py-2 px-2 text-center text-gray-600 dark:text-gray-300">
                              {totals.ftm}-{totals.fta}
                            </td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProcessingStatus({ game }: { game: any }) {
  const status = statusConfig[game.status] || statusConfig.queued;
  const isProcessing = ['detecting', 'tracking', 'analyzing'].includes(game.status);

  return (
    <div className={`rounded-xl p-6 ${status.bgColor}`}>
      <div className="flex items-center gap-3 mb-4">
        {isProcessing ? (
          <Loader2 className={`w-6 h-6 animate-spin ${status.color}`} />
        ) : game.status === 'ready' ? (
          <CheckCircle className={`w-6 h-6 ${status.color}`} />
        ) : game.status === 'failed' ? (
          <AlertCircle className={`w-6 h-6 ${status.color}`} />
        ) : (
          <Clock className={`w-6 h-6 ${status.color}`} />
        )}
        <span className={`text-lg font-semibold ${status.color}`}>{status.label}</span>
      </div>

      {isProcessing && (
        <>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[#0f2d52] transition-all duration-500"
              style={{ width: `${game.processingProgress || 0}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{game.processingProgress || 0}% complete</p>
        </>
      )}

      {game.status === 'queued' && (
        <p className="text-sm text-gray-600">
          Your video is in the queue. Processing will begin shortly.
        </p>
      )}

      {game.status === 'failed' && game.processingError && (
        <p className="text-sm text-red-600 mt-2">{game.processingError}</p>
      )}
    </div>
  );
}

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<'insights' | 'players' | 'teams' | 'plays' | 'video'>('insights');
  const [playerTeamFilter, setPlayerTeamFilter] = useState<'all' | 'home' | 'away'>('all');
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const { data, error, isLoading, mutate } = useSWR(`/api/games/${id}`, fetcher, {
    refreshInterval: 5000, // Poll while processing
  });

  // Function to trigger Gemini analysis
  async function handleAnalyzeWithGemini() {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/games/${id}/analyze-gemini`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Analysis failed');
      }
      // Refresh the data
      mutate();
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Generate timeline markers from plays and key moments
  const videoMarkers = useMemo(() => {
    if (!data?.game) return [];

    const markers: { id: string; time: number; label: string; type: 'play' | 'moment' | 'highlight'; color?: string }[] = [];

    // Add plays as markers
    data.game.detectedPlays?.forEach((play: any) => {
      const startTime = play.startTimestamp ? parseFloat(play.startTimestamp) :
                        play.startTime ? play.startTime : null;
      if (startTime !== null) {
        markers.push({
          id: `play-${play.id}`,
          time: startTime,
          label: `Play ${play.playNumber || ''}${play.formation ? ` - ${play.formation}` : ''}${play.playType && play.playType !== 'unknown' ? ` (${play.playType})` : ''}`.trim(),
          type: 'play',
          color: '#f59e0b',
        });
      }
    });

    // Add key moments from players
    data.game.detectedTeams?.forEach((team: any) => {
      team.players?.forEach((player: any) => {
        player.keyMoments?.forEach((moment: any) => {
          const time = moment.timestampSeconds ? parseFloat(moment.timestampSeconds) : null;
          if (time !== null) {
            markers.push({
              id: `moment-${moment.id}`,
              time,
              label: `${player.displayName}: ${moment.description || moment.momentType}`,
              type: moment.sentiment === 'positive' ? 'highlight' : 'moment',
              color: moment.sentiment === 'positive' ? '#22c55e' : moment.sentiment === 'negative' ? '#ef4444' : '#f59e0b',
            });
          }
        });
      });
    });

    return markers.sort((a, b) => a.time - b.time);
  }, [data?.game]);

  // Create a map from jersey number to gemini player scouting data
  const geminiPlayerMap = useMemo(() => {
    const map = new Map<number, any>();
    const playerScouting = data?.game?.geminiAnalysis?.playerScouting;
    const players = Array.isArray(playerScouting) ? playerScouting : (playerScouting?.players || []);
    for (const p of players) {
      if (p.jersey != null || p.jerseyNumber != null) {
        map.set(p.jersey ?? p.jerseyNumber, p);
      }
    }
    return map;
  }, [data?.game?.geminiAnalysis?.playerScouting]);

  const openVideoAt = (time: number = 0) => {
    setVideoStartTime(time);
    setIsVideoOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data?.game) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          Failed to load game. Please try again.
        </div>
      </div>
    );
  }

  const { game } = data;
  const isReady = game.status === 'ready';
  const allPlayers = game.detectedTeams?.flatMap((team: any) => team.players || []) || [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Back link */}
      <Link href="/games" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Games
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{game.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            {game.opponent && <span>vs {game.opponent}</span>}
            {game.sport && <span className="capitalize">{game.sport}</span>}
            {game.gameDate && <span>{new Date(game.gameDate).toLocaleDateString()}</span>}
          </div>
        </div>
        {/* Video Player Modal */}
        {game.videoUrl && (
          <VideoPlayerModal
            isOpen={isVideoOpen}
            onClose={() => setIsVideoOpen(false)}
            src={game.videoUrl}
            poster={game.thumbnailUrl}
            title={game.title || game.name || 'Game Film'}
            markers={videoMarkers}
            initialTime={videoStartTime}
          />
        )}

        {/* Player Detail Modal */}
        <PlayerDetailModal
          player={selectedPlayer}
          teamName={selectedPlayer?.team?.toLowerCase() === 'home' ? game.geminiAnalysis?.homeTeamName : game.geminiAnalysis?.awayTeamName}
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      </div>

      {/* Gemini Analysis Error */}
      {analyzeError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{analyzeError}</span>
          <button
            onClick={() => setAnalyzeError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            &times;
          </button>
        </div>
      )}

      {/* Processing Status (if not ready) */}
      {!isReady && (
        <div className="mb-8">
          <ProcessingStatus game={game} />
        </div>
      )}

      {/* Main Content - Only show when ready */}
      {isReady && (
        <div>
            {/* Show banner if analysis is in progress */}
            {game.geminiAnalysis && !isAnalysisComplete(game) && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-lg p-4 mb-6 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Analysis in progress...</p>
                  <p className="text-xs text-purple-700">Full scouting report will be available when complete</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-px -mb-px scrollbar-hide">
              {isAnalysisComplete(game) && (
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'insights'
                      ? 'border-[#0f2d52] text-[#0f2d52] dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Insights
                  </span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('players')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'players'
                    ? 'border-[#0f2d52] text-[#0f2d52] dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Player Reports
                </span>
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'teams'
                    ? 'border-[#0f2d52] text-[#0f2d52] dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Team Reports
                </span>
              </button>
              {game.detectedPlays && game.detectedPlays.length > 0 && (
                <button
                  onClick={() => setActiveTab('plays')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'plays'
                      ? 'border-[#0f2d52] text-[#0f2d52] dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Film className="w-4 h-4" />
                    Plays
                  </span>
                </button>
              )}
              {game.videoUrl && (
                <button
                  onClick={() => setActiveTab('video')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'video'
                      ? 'border-[#0f2d52] text-[#0f2d52] dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Video
                  </span>
                </button>
              )}
            </div>

            {/* AI Insights Tab */}
            {activeTab === 'insights' && isAnalysisComplete(game) && (
              <GeminiInsights game={game} />
            )}

            {/* Player Reports Tab */}
            {activeTab === 'players' && (() => {
              // Handle both array and object formats for playerScouting
              const playerScouting = game.geminiAnalysis?.playerScouting;
              const rawScoutedPlayers = Array.isArray(playerScouting)
                ? playerScouting
                : (playerScouting?.players || []);

              // Create a lookup for player names from detected players in database
              const playerNameLookup: Record<string, string> = {};
              game.detectedTeams?.forEach((team: any) => {
                const teamLabel = team.teamLabel?.toLowerCase();
                team.players?.forEach((p: any) => {
                  const key = `${teamLabel}:${p.jerseyNumber}`;
                  if (p.displayName && !p.displayName.startsWith('#')) {
                    playerNameLookup[key] = p.displayName;
                  }
                });
              });

              // Merge player names into scouted players
              const scoutedPlayers = rawScoutedPlayers.map((player: any) => {
                const teamLabel = player.team?.toLowerCase();
                const key = `${teamLabel}:${player.jerseyNumber}`;
                return {
                  ...player,
                  name: player.name || playerNameLookup[key] || null,
                };
              });

              return (
              <>
                {/* AI Player Scouting Reports */}
                {scoutedPlayers.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-600" />
                        Individual Player Scouting
                      </h3>
                      {/* Team Filter Tabs */}
                      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                          onClick={() => setPlayerTeamFilter('all')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            playerTeamFilter === 'all'
                              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setPlayerTeamFilter('home')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            playerTeamFilter === 'home'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {game.geminiAnalysis?.homeTeamName || 'Home'}
                        </button>
                        <button
                          onClick={() => setPlayerTeamFilter('away')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            playerTeamFilter === 'away'
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {game.geminiAnalysis?.awayTeamName || 'Away'}
                        </button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {scoutedPlayers
                        .filter((player: any) => playerTeamFilter === 'all' || player.team?.toLowerCase() === playerTeamFilter)
                        .map((player: any, idx: number) => (
                          <ScoutingPlayerCard
                            key={idx}
                            player={player}
                            teamName={player.team?.toLowerCase() === 'home' ? game.geminiAnalysis?.homeTeamName : game.geminiAnalysis?.awayTeamName}
                            onClick={() => setSelectedPlayer(player)}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Only show old Detected Players section if no Gemini player scouting */}
                {scoutedPlayers.length === 0 && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{allPlayers.length} players detected</span>
                    </div>

                    {allPlayers.length === 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center">
                        <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No players detected yet</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {allPlayers.map((player: any) => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            gameId={id}
                            onMomentClick={openVideoAt}
                            geminiPlayerData={geminiPlayerMap.get(player.jerseyNumber)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
              );
            })()}

            {/* Plays Tab */}
            {activeTab === 'plays' && (
              <>
                {/* Key Moments from AI Scouting */}
                {game.geminiAnalysis?.coachingInsights?.keyMoments?.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      Key Moments
                    </h3>
                    <div className="grid gap-3">
                      {game.geminiAnalysis.coachingInsights.keyMoments.map((moment: any, idx: number) => {
                        const seconds = parseTimestamp(moment.timestamp);

                        return (
                          <div
                            key={idx}
                            className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => seconds !== null && openVideoAt(seconds)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="bg-yellow-400 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 font-bold rounded-lg px-3 py-1.5 text-sm font-mono">
                                  {moment.timestamp}
                                </div>
                                <div>
                                  <p className="text-gray-800 dark:text-gray-200 font-medium">{moment.description}</p>
                                  {moment.impact && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{moment.impact}</p>
                                  )}
                                </div>
                              </div>
                              {game.videoUrl && seconds !== null && (
                                <Button variant="ghost" size="sm" className="gap-1 text-yellow-700 hover:text-yellow-800 shrink-0">
                                  <Play className="w-4 h-4" />
                                  Watch
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Detected Plays */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{game.detectedPlays?.length || 0} plays detected</span>
                  {game.videoUrl && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => openVideoAt(0)}>
                      <Play className="w-4 h-4" />
                      Watch All
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {game.detectedPlays?.map((play: any, index: number) => {
                    const startTime = play.startTimestamp ? parseFloat(play.startTimestamp) :
                                      play.startTime ? play.startTime : null;
                    const endTime = play.endTimestamp ? parseFloat(play.endTimestamp) :
                                    play.endTime ? play.endTime : null;

                    return (
                      <div
                        key={play.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => startTime !== null && openVideoAt(startTime)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-[#0f2d52] text-white flex items-center justify-center font-bold">
                              {play.playNumber || index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {play.formation ? `${play.formation}` : `Play ${play.playNumber || index + 1}`}
                                </h4>
                                {play.playType && play.playType !== 'unknown' && (
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    play.playType === 'pass' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                                    play.playType === 'run' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {play.playType}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {startTime !== null && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {Math.floor(startTime / 60)}:{Math.floor(startTime % 60).toString().padStart(2, '0')}
                                  </span>
                                )}
                                {play.down && play.distance && (
                                  <span>{play.down}&{play.distance}</span>
                                )}
                                {play.yardsGained !== null && play.yardsGained !== undefined && (
                                  <span className={play.yardsGained > 0 ? 'text-green-600' : 'text-red-600'}>
                                    {play.yardsGained > 0 ? '+' : ''}{play.yardsGained} yds
                                  </span>
                                )}
                                {play.playDirection && (
                                  <span className="capitalize">{play.playDirection}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {startTime !== null && game.videoUrl && (
                            <Button variant="ghost" size="sm" className="gap-1 text-[#0f2d52]">
                              <Play className="w-4 h-4" />
                              Watch
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Team Reports Tab */}
            {activeTab === 'teams' && (
              <>
                {/* AI Team Scouting Reports */}
                {game.geminiAnalysis?.teamScouting && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Team Systems & Tendencies
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {game.geminiAnalysis.teamScouting.homeTeam && (
                        <TeamScoutingCard
                          team={game.geminiAnalysis.teamScouting.homeTeam}
                          teamLabel="home"
                          teamName={game.geminiAnalysis?.homeTeamName}
                        />
                      )}
                      {game.geminiAnalysis.teamScouting.awayTeam && (
                        <TeamScoutingCard
                          team={game.geminiAnalysis.teamScouting.awayTeam}
                          teamLabel="away"
                          teamName={game.geminiAnalysis?.awayTeamName}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Only show old Detected Teams section if no Gemini team scouting */}
                {!game.geminiAnalysis?.teamScouting && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{game.detectedTeams?.length || 0} teams detected</span>
                    </div>

                    {!game.detectedTeams || game.detectedTeams.length === 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center">
                        <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No team data available yet</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {game.detectedTeams.map((team: any) => (
                          <TeamReportCard key={team.id} team={team} sport={game.sport || 'football'} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Video Tab */}
            {activeTab === 'video' && game.videoUrl && (() => {
              const keyMoments = game.geminiAnalysis?.coachingInsights?.keyMoments || [];
              const scoringRuns = game.geminiAnalysis?.coachingInsights?.scoringRuns || [];

              const jumpToTime = (seconds: number | null) => {
                const video = document.querySelector('video');
                if (video && seconds !== null) {
                  video.currentTime = seconds;
                  video.play();
                }
              };

              return (
                <div className="space-y-4">
                  {/* Video Player */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="aspect-video bg-black">
                      <video
                        src={game.videoUrl}
                        controls
                        className="w-full h-full"
                        playsInline
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>

                  {/* Highlights Grid - always 2 columns on md+ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Key Moments */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        Key Moments {keyMoments.length > 0 && `(${keyMoments.length})`}
                      </h4>
                      {keyMoments.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {keyMoments.map((moment: any, idx: number) => {
                            const seconds = typeof moment.timestamp === 'string'
                              ? parseTimestamp(moment.timestamp)
                              : moment.timestamp;
                            return (
                              <button
                                key={idx}
                                onClick={() => jumpToTime(seconds)}
                                className="w-full text-left p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors border border-yellow-200"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Play className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                                  <span className="text-xs font-mono font-bold text-yellow-700">
                                    {formatTime(seconds)}
                                  </span>
                                  {moment.type && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-800 capitalize flex-shrink-0">
                                      {moment.type.replace('_', ' ')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700">{moment.description}</p>
                                {moment.significance && (
                                  <p className="text-xs text-gray-500 mt-1 italic">{moment.significance}</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-400">
                          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No key moments detected</p>
                        </div>
                      )}
                    </div>

                    {/* Scoring Runs */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        Scoring Runs {scoringRuns.length > 0 && `(${scoringRuns.length})`}
                      </h4>
                      {scoringRuns.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {scoringRuns.map((run: any, idx: number) => {
                            // Handle videoTimestamp (new), timespan (old), or startTime formats
                            const timeStr = run.videoTimestamp || run.timespan || run.startTime || '';
                            // Pass quarter if available to convert game clock to video time
                            const startSeconds = parseTimestamp(timeStr, run.quarter);
                            return (
                              <button
                                key={idx}
                                onClick={() => jumpToTime(startSeconds)}
                                className={`w-full text-left p-3 rounded-lg transition-colors border ${
                                  run.team?.toLowerCase() === 'home' || run.team === 'MVA'
                                    ? 'bg-blue-50 hover:bg-blue-100 border-blue-200'
                                    : 'bg-orange-50 hover:bg-orange-100 border-orange-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Play className="w-3 h-3 text-gray-600 flex-shrink-0" />
                                    <span className="text-xs font-mono font-bold text-gray-700">
                                      {run.quarter ? `Q${run.quarter} • ` : ''}{formatTime(startSeconds)}
                                    </span>
                                  </div>
                                  <span className={`text-sm font-bold flex-shrink-0 ${
                                    run.team?.toLowerCase() === 'home' || run.team === 'MVA' ? 'text-blue-700' : 'text-orange-700'
                                  }`}>
                                    {run.run || run.score} {run.team}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">{run.cause || run.description}</p>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-400">
                          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No scoring runs detected</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* No highlights message */}
                  {keyMoments.length === 0 && scoringRuns.length === 0 && (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                      <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No highlights available yet.</p>
                      <p className="text-sm text-gray-400 mt-1">Run AI analysis to generate key moments and scoring runs.</p>
                    </div>
                  )}
                </div>
              );
            })()}
        </div>
      )}

      {/* Waiting State */}
      {!isReady && game.status !== 'failed' && (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Your Game Film</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Our AI is analyzing your video. This typically takes 30-60 minutes depending on the length.
            We'll email you when it's ready.
          </p>
        </div>
      )}
    </div>
  );
}
