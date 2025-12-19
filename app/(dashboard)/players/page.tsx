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
  ChevronRight,
  Loader2,
  Filter,
  Star
} from 'lucide-react';

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
  recentGames: {
    gameId: string;
    gameName: string;
    grade: number;
    date: string;
  }[];
}

export default function PlayersPage() {
  const { data, isLoading } = useSWR('/api/players', fetcher);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'grade' | 'name' | 'games'>('grade');

  const players: Player[] = data?.players || [];

  const filteredPlayers = players
    .filter((player) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        player.jerseyNumber?.includes(search) ||
        player.displayName?.toLowerCase().includes(searchLower) ||
        player.teamName?.toLowerCase().includes(searchLower) ||
        player.positionGuess?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'grade') {
        return (b.avgGrade || 0) - (a.avgGrade || 0);
      } else if (sortBy === 'games') {
        return b.gamesPlayed - a.gamesPlayed;
      } else {
        return (a.displayName || a.jerseyNumber || '').localeCompare(
          b.displayName || b.jerseyNumber || ''
        );
      }
    });

  function getTrendIcon(trend: string | null) {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Player Insights</h1>
        <p className="text-gray-600 mt-1">
          Track player performance across all games
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by jersey #, name, position, or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52] focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
          >
            <option value="grade">Sort by Grade</option>
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
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {search ? 'No players match your search' : 'No players detected yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {!search && 'Upload game film to start tracking players'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <Link
              key={player.id}
              href={
                player.recentGames[0]
                  ? `/game/${player.recentGames[0].gameId}#player-${player.id}`
                  : '#'
              }
            >
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold text-lg">
                      {player.jerseyNumber || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {player.displayName || `#${player.jerseyNumber}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {player.positionGuess && `${player.positionGuess} • `}
                        {player.teamName}
                      </p>
                    </div>
                  </div>
                  {player.avgGrade !== null && (
                    <div className="flex items-center gap-1">
                      {getTrendIcon(player.trend)}
                      <span
                        className={`text-2xl font-bold ${
                          player.avgGrade >= 80
                            ? 'text-green-600'
                            : player.avgGrade >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {player.avgGrade.toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{player.gamesPlayed} game{player.gamesPlayed !== 1 ? 's' : ''}</span>
                  {player.avgGrade !== null && (
                    <span>Avg: {player.avgGrade.toFixed(1)}</span>
                  )}
                </div>

                {/* Recent Games Mini Chart */}
                {player.recentGames.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 mb-2">Recent Performance</p>
                    <div className="flex items-end gap-1 h-8">
                      {player.recentGames.slice(0, 5).map((game, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t"
                          style={{
                            height: `${Math.max(20, (game.grade / 100) * 100)}%`,
                            backgroundColor:
                              game.grade >= 80
                                ? '#22c55e'
                                : game.grade >= 60
                                ? '#eab308'
                                : '#ef4444',
                            opacity: 0.4 + (i / player.recentGames.length) * 0.6,
                          }}
                          title={`${game.gameName}: ${game.grade}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {filteredPlayers.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Total Players</p>
              <p className="text-2xl font-bold text-gray-900">{filteredPlayers.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Grade</p>
              <p className="text-2xl font-bold text-gray-900">
                {(
                  filteredPlayers.reduce((sum, p) => sum + (p.avgGrade || 0), 0) /
                  filteredPlayers.filter((p) => p.avgGrade !== null).length || 0
                ).toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Top Performer</p>
              <p className="text-2xl font-bold text-green-600">
                #{filteredPlayers[0]?.jerseyNumber || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Most Games</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.max(...filteredPlayers.map((p) => p.gamesPlayed), 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
