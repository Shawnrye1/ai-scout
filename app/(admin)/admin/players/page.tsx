'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import {
  Users,
  Search,
  Loader2,
  ChevronRight,
  Trash2,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Player {
  id: number;
  jerseyNumber: number;
  name: string | null;
  height: string | null;
  weight: number | null;
  position: string | null;
  yearGrade: string | null;
  sportsTeamId: number;
  teamName: string;
  teamSport: string;
  teamCity: string | null;
  teamState: string | null;
}

export default function AdminPlayersPage() {
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (sportFilter) queryParams.set('sport', sportFilter);
  if (teamFilter) queryParams.set('teamId', teamFilter);
  if (positionFilter) queryParams.set('position', positionFilter);

  const { data, isLoading, error } = useSWR(
    `/api/admin/roster-players?${queryParams.toString()}`,
    fetcher
  );

  const players: Player[] = data?.players || [];
  const positions: string[] = data?.positions || [];
  const teams: { id: number; name: string; sport: string }[] = data?.teams || [];

  async function handleDeletePlayer(playerId: number, playerName: string) {
    if (!confirm(`Are you sure you want to delete "${playerName || `Player #${playerId}`}"?`)) return;

    try {
      const res = await fetch(`/api/admin/roster-players?id=${playerId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete player');
      mutate(`/api/admin/roster-players?${queryParams.toString()}`);
    } catch (err) {
      alert('Failed to delete player');
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Player Database</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Source of truth for all players. Click any player to view full details and game history.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, jersey number, or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
          >
            <option value="">All Sports</option>
            <option value="basketball">Basketball</option>
            <option value="football">Football</option>
          </select>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
          >
            <option value="">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
          >
            <option value="">All Positions</option>
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{players.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Players</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{teams.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Teams</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {players.filter((p) => p.teamSport === 'basketball').length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Basketball</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {players.filter((p) => p.teamSport === 'football').length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Football</div>
        </div>
      </div>

      {/* Players Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          Failed to load players. Please try again.
        </div>
      ) : players.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {search || sportFilter || teamFilter || positionFilter
              ? 'No players match your filters'
              : 'No players in database yet'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Players are added when coaches create their rosters or via Team Database.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 text-left text-sm text-gray-500 dark:text-gray-400">
                  <th className="py-3 px-4 font-medium">#</th>
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Team</th>
                  <th className="py-3 px-4 font-medium">Position</th>
                  <th className="py-3 px-4 font-medium">Height</th>
                  <th className="py-3 px-4 font-medium">Weight</th>
                  <th className="py-3 px-4 font-medium">Year</th>
                  <th className="py-3 px-4 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr
                    key={player.id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                  >
                    <td className="py-3 px-4">
                      <div className="w-10 h-10 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold text-sm">
                        {player.jerseyNumber}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/players/${player.id}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-[#0f2d52] dark:hover:text-blue-400"
                      >
                        {player.name || `Player #${player.jerseyNumber}`}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/teams/${player.sportsTeamId}`}
                        className="text-gray-600 dark:text-gray-400 hover:text-[#0f2d52] dark:hover:text-blue-400"
                      >
                        <div>{player.teamName}</div>
                        {player.teamCity && player.teamState && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {player.teamCity}, {player.teamState}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      {player.position ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {player.position}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {player.height || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {player.weight ? `${player.weight} lbs` : '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {player.yearGrade || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/players/${player.id}`}
                          className="p-1.5 text-gray-400 hover:text-[#0f2d52] hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeletePlayer(player.id, player.name || '')}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
