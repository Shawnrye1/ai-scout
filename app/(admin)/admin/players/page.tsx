'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Filter, ChevronDown, ExternalLink } from 'lucide-react';

interface Player {
  id: string;
  jerseyNumber: string;
  displayName: string;
  positionGuess: string;
  teamName: string;
  gameName: string;
  gameId: string;
  overallGrade: number | null;
  framesVisible: number;
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'graded' | 'ungraded'>('all');

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      const res = await fetch('/api/admin/players');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPlayers = players.filter((player) => {
    // Search filter
    const matchesSearch =
      !search ||
      player.jerseyNumber?.includes(search) ||
      player.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      player.teamName?.toLowerCase().includes(search.toLowerCase());

    // Grade filter
    const matchesFilter =
      filter === 'all' ||
      (filter === 'graded' && player.overallGrade !== null) ||
      (filter === 'ungraded' && player.overallGrade === null);

    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Player Database</h1>
        <p className="text-gray-600 mt-1">
          View all detected players across all games
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by jersey #, name, or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52] focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-[#0f2d52] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({players.length})
          </button>
          <button
            onClick={() => setFilter('graded')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'graded'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Graded
          </button>
          <button
            onClick={() => setFilter('ungraded')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'ungraded'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Ungraded
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading players...</div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {search ? 'No players match your search' : 'No players detected yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Game
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold">
                        {player.jerseyNumber || '?'}
                      </div>
                      <div className="font-medium text-gray-900">
                        {player.displayName || `#${player.jerseyNumber}`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {player.teamName || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {player.positionGuess || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`/game/${player.gameId}`}
                      className="text-sm text-[#0f2d52] hover:underline inline-flex items-center gap-1"
                    >
                      {player.gameName || 'View Game'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    {player.overallGrade !== null ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          player.overallGrade >= 80
                            ? 'bg-green-100 text-green-700'
                            : player.overallGrade >= 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {player.overallGrade.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Not graded</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {player.framesVisible || 0} frames
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
