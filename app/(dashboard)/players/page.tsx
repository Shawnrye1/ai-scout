'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Users,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter,
  Target,
  Zap,
  AlertTriangle,
  BarChart3,
  X,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Player {
  id: string;
  jerseyNumber: string;
  displayName: string;
  positionGuess: string;
  teamName: string;
  overallGrade: number | null;
  gamesPlayed: number;
  avgGrade: number | null;
  trend: 'up' | 'down' | 'stable' | null;
  trendValue: number;
  recentGames: {
    gameId: string;
    gameName: string;
    grade: number;
    date: string;
    stats: { points: number; rebounds: number; assists: number; steals: number; blocks: number };
  }[];
  totalStats: { points: number; rebounds: number; assists: number; steals: number; blocks: number };
  avgStats: { ppg: number; rpg: number; apg: number; spg: number; bpg: number };
  strengths: string[];
  developmentAreas: string[];
  summary: string | null;
  tendencies: any;
  keyMoments: { description: string; sentiment: string; momentType: string; timestamp: string | null }[];
}

interface TeamFocusArea {
  area: string;
  playerCount: number;
}

function getTrendIcon(trend: string | null) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function getGradeColor(grade: number): string {
  if (grade >= 85) return 'text-green-600';
  if (grade >= 75) return 'text-blue-600';
  if (grade >= 65) return 'text-yellow-600';
  return 'text-red-600';
}

function getGradeBg(grade: number): string {
  if (grade >= 85) return 'bg-green-100 text-green-700';
  if (grade >= 75) return 'bg-blue-100 text-blue-700';
  if (grade >= 65) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

function PlayerCard({
  player,
  isExpanded,
  onToggle,
  isComparing,
  onCompareToggle,
}: {
  player: Player;
  isExpanded: boolean;
  onToggle: () => void;
  isComparing: boolean;
  onCompareToggle: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Card Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold text-lg">
              {player.jerseyNumber || '?'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {player.displayName || `#${player.jerseyNumber}`}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {player.positionGuess && `${player.positionGuess} • `}
                {player.gamesPlayed} game{player.gamesPlayed !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {player.avgGrade !== null && (
              <div className="flex items-center gap-1">
                {getTrendIcon(player.trend)}
                <span className={`text-2xl font-bold ${getGradeColor(player.avgGrade)}`}>
                  {player.avgGrade.toFixed(0)}
                </span>
              </div>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            <strong>{player.avgStats.ppg.toFixed(1)}</strong> PPG
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            <strong>{player.avgStats.rpg.toFixed(1)}</strong> RPG
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            <strong>{player.avgStats.apg.toFixed(1)}</strong> APG
          </span>
        </div>

        {/* Mini Performance Chart */}
        {!isExpanded && player.recentGames.length > 0 && (
          <div className="mt-3 flex items-end gap-1 h-6">
            {player.recentGames.slice(0, 6).map((game, i) => (
              <div
                key={i}
                className="flex-1 rounded-t max-w-8"
                style={{
                  height: `${Math.max(20, (game.grade / 100) * 100)}%`,
                  backgroundColor:
                    game.grade >= 85 ? '#22c55e' : game.grade >= 75 ? '#3b82f6' : game.grade >= 65 ? '#eab308' : '#ef4444',
                  opacity: 0.5 + (i / player.recentGames.length) * 0.5,
                }}
                title={`${game.gameName}: ${game.grade}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Compare Button */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompareToggle();
              }}
              className={`text-sm px-3 py-1 rounded-full flex items-center gap-1 transition-colors ${
                isComparing
                  ? 'bg-[#0f2d52] text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100'
              }`}
            >
              {isComparing ? <Check className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
              {isComparing ? 'Added to Compare' : 'Add to Compare'}
            </button>
            <Link
              href={player.recentGames[0] ? `/game/${player.recentGames[0].gameId}` : '#'}
              className="text-sm text-[#0f2d52] dark:text-blue-400 hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              View in Game <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="p-4 grid grid-cols-5 gap-2 text-center border-b border-gray-100 dark:border-gray-700">
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{player.totalStats.points}</div>
              <div className="text-xs text-gray-500">Total PTS</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{player.totalStats.rebounds}</div>
              <div className="text-xs text-gray-500">Total REB</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{player.totalStats.assists}</div>
              <div className="text-xs text-gray-500">Total AST</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{player.totalStats.steals}</div>
              <div className="text-xs text-gray-500">Total STL</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{player.totalStats.blocks}</div>
              <div className="text-xs text-gray-500">Total BLK</div>
            </div>
          </div>

          {/* Strengths & Development Areas */}
          <div className="p-4 grid grid-cols-2 gap-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                <Zap className="w-4 h-4 text-green-500" /> Strengths
              </h4>
              {player.strengths.length > 0 ? (
                <ul className="space-y-1">
                  {player.strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1">
                      <span className="text-green-500 mt-1">•</span>
                      <span className="line-clamp-2">{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No strengths identified yet</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                <Target className="w-4 h-4 text-orange-500" /> Focus Areas
              </h4>
              {player.developmentAreas.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {player.developmentAreas.slice(0, 4).map((area, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No areas identified yet</p>
              )}
            </div>
          </div>

          {/* Game-by-Game Breakdown */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Game-by-Game</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {player.recentGames.map((game, i) => (
                <Link
                  key={i}
                  href={`/game/${game.gameId}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        game.grade >= 85 ? 'bg-green-500' : game.grade >= 75 ? 'bg-blue-500' : game.grade >= 65 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    >
                      {game.grade || '-'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{game.gameName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {game.stats.points}pts {game.stats.rebounds}reb {game.stats.assists}ast
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Key Moments */}
          {player.keyMoments.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Key Moments</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {player.keyMoments.slice(0, 5).map((moment, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        moment.sentiment === 'positive'
                          ? 'bg-green-500'
                          : moment.sentiment === 'negative'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-gray-600 dark:text-gray-400 line-clamp-2">{moment.description}</span>
                    {moment.timestamp && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{moment.timestamp}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ComparePanel({
  players,
  onRemove,
  onClear,
}: {
  players: Player[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (players.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Comparing {players.length} Player{players.length !== 1 ? 's' : ''}
          </h3>
          <button onClick={onClear} className="text-sm text-gray-500 hover:text-gray-700">
            Clear All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 pr-4 font-medium">Player</th>
                <th className="pb-2 px-4 font-medium text-center">Grade</th>
                <th className="pb-2 px-4 font-medium text-center">PPG</th>
                <th className="pb-2 px-4 font-medium text-center">RPG</th>
                <th className="pb-2 px-4 font-medium text-center">APG</th>
                <th className="pb-2 px-4 font-medium text-center">Games</th>
                <th className="pb-2 px-4 font-medium text-center">Trend</th>
                <th className="pb-2 pl-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold text-sm">
                        {player.jerseyNumber}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {player.displayName || `#${player.jerseyNumber}`}
                        </div>
                        <div className="text-xs text-gray-500">{player.positionGuess || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span className={`font-bold ${getGradeColor(player.avgGrade || 0)}`}>
                      {player.avgGrade?.toFixed(0) || '-'}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-center">{player.avgStats.ppg.toFixed(1)}</td>
                  <td className="py-2 px-4 text-center">{player.avgStats.rpg.toFixed(1)}</td>
                  <td className="py-2 px-4 text-center">{player.avgStats.apg.toFixed(1)}</td>
                  <td className="py-2 px-4 text-center">{player.gamesPlayed}</td>
                  <td className="py-2 px-4 text-center">{getTrendIcon(player.trend)}</td>
                  <td className="py-2 pl-4">
                    <button
                      onClick={() => onRemove(player.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeamFocusSection({ focusAreas }: { focusAreas: TeamFocusArea[] }) {
  if (focusAreas.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-orange-500" />
        Team Development Focus
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Areas where multiple players need improvement — great for practice planning
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {focusAreas.map((area) => (
          <div
            key={area.area}
            className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center"
          >
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{area.playerCount}</div>
            <div className="text-sm text-orange-700 dark:text-orange-300">{area.area}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayersPage() {
  const { data, isLoading } = useSWR('/api/players', fetcher);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'grade' | 'name' | 'games' | 'ppg'>('grade');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [comparePlayers, setComparePlayers] = useState<string[]>([]);

  const players: Player[] = data?.players || [];
  const teamFocusAreas: TeamFocusArea[] = data?.teamFocusAreas || [];
  const positions: string[] = data?.positions || [];
  const summary = data?.summary || {};

  const filteredPlayers = players
    .filter((player) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          player.jerseyNumber?.includes(search) ||
          player.displayName?.toLowerCase().includes(searchLower) ||
          player.positionGuess?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Position filter
      if (positionFilter !== 'all' && player.positionGuess !== positionFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'grade') return (b.avgGrade || 0) - (a.avgGrade || 0);
      if (sortBy === 'games') return b.gamesPlayed - a.gamesPlayed;
      if (sortBy === 'ppg') return b.avgStats.ppg - a.avgStats.ppg;
      return (a.displayName || a.jerseyNumber || '').localeCompare(b.displayName || b.jerseyNumber || '');
    });

  const comparePlayersList = players.filter((p) => comparePlayers.includes(p.id));

  const handleCompareToggle = (playerId: string) => {
    setComparePlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : prev.length < 4
        ? [...prev, playerId]
        : prev
    );
  };

  return (
    <div className={`p-6 lg:p-8 max-w-7xl mx-auto ${comparePlayers.length > 0 ? 'pb-48' : ''}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Player Development Hub</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track player performance, compare players, and identify practice focus areas
        </p>
      </div>

      {/* Quick Stats */}
      {summary.totalPlayers > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Players</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalPlayers}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Team Avg Grade</div>
            <div className={`text-2xl font-bold ${getGradeColor(summary.avgTeamGrade || 0)}`}>
              {summary.avgTeamGrade?.toFixed(1) || '-'}
            </div>
          </div>
          {summary.topPerformer && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">Top Performer</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                #{summary.topPerformer.jerseyNumber}
              </div>
              <div className="text-sm text-green-600">{summary.topPerformer.avgGrade?.toFixed(0)} avg</div>
            </div>
          )}
          {summary.mostImproved && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">Most Improved</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                #{summary.mostImproved.jerseyNumber}
              </div>
              <div className="text-sm text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +{summary.mostImproved.trendValue?.toFixed(0)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Focus Areas */}
      <TeamFocusSection focusAreas={teamFocusAreas} />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by jersey #, name, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
          />
        </div>
        <div className="flex items-center gap-2">
          {positions.length > 0 && (
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
            >
              <option value="all">All Positions</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
          >
            <option value="grade">Sort by Grade</option>
            <option value="ppg">Sort by PPG</option>
            <option value="games">Sort by Games</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Players Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {search || positionFilter !== 'all' ? 'No players match your filters' : 'No players detected yet'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {!search && positionFilter === 'all' && 'Upload game film to start tracking players'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isExpanded={expandedPlayer === player.id}
              onToggle={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
              isComparing={comparePlayers.includes(player.id)}
              onCompareToggle={() => handleCompareToggle(player.id)}
            />
          ))}
        </div>
      )}

      {/* Compare Panel */}
      <ComparePanel
        players={comparePlayersList}
        onRemove={(id) => setComparePlayers((prev) => prev.filter((p) => p !== id))}
        onClear={() => setComparePlayers([])}
      />
    </div>
  );
}
