'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import {
  User,
  ArrowLeft,
  Pencil,
  Save,
  X,
  Loader2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Trophy,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  createdAt: string;
  updatedAt: string;
  teamName: string;
  teamSport: string;
  teamCity: string | null;
  teamState: string | null;
  teamJerseyColorHome: string | null;
  teamJerseyColorAway: string | null;
}

interface GameAppearance {
  gameId: string;
  gameName: string | null;
  gameDate: string | null;
  opponent: string | null;
  detectedPlayerId: string;
  overallGrade: string | null;
  summary: string | null;
}

interface Stats {
  gamesPlayed: number;
  averageGrade: number | null;
  highestGrade: number | null;
  lowestGrade: number | null;
}

const POSITIONS = {
  basketball: ['PG', 'SG', 'SF', 'PF', 'C'],
  football: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'],
};

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', '5th Year'];

export default function AdminPlayerDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = use(params);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useSWR(`/api/admin/roster-players/${playerId}`, fetcher);

  const player: Player | null = data?.player;
  const gameAppearances: GameAppearance[] = data?.gameAppearances || [];
  const stats: Stats = data?.stats || { gamesPlayed: 0, averageGrade: null, highestGrade: null, lowestGrade: null };
  const allTeams: { id: number; name: string; sport: string }[] = data?.allTeams || [];

  const [form, setForm] = useState({
    jerseyNumber: '',
    name: '',
    position: '',
    height: '',
    weight: '',
    yearGrade: '',
    sportsTeamId: '',
  });

  // Initialize form when player data loads
  if (player && !form.jerseyNumber && !editing) {
    setForm({
      jerseyNumber: player.jerseyNumber.toString(),
      name: player.name || '',
      position: player.position || '',
      height: player.height || '',
      weight: player.weight?.toString() || '',
      yearGrade: player.yearGrade || '',
      sportsTeamId: player.sportsTeamId.toString(),
    });
  }

  const positions = player ? POSITIONS[player.teamSport as keyof typeof POSITIONS] || POSITIONS.basketball : [];

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/roster-players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(playerId),
          jerseyNumber: parseInt(form.jerseyNumber),
          name: form.name || null,
          position: form.position || null,
          height: form.height || null,
          weight: form.weight || null,
          yearGrade: form.yearGrade || null,
          sportsTeamId: parseInt(form.sportsTeamId),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update player');
      }

      mutate(`/api/admin/roster-players/${playerId}`);
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Player not found</p>
        <Link href="/admin/players" className="text-[#0f2d52] hover:underline mt-2 inline-block">
          Back to Players
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/admin/players"
        className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Player Database
      </Link>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Player Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold text-3xl">
              {player.jerseyNumber}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {player.name || `Player #${player.jerseyNumber}`}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                <Link href={`/admin/teams/${player.sportsTeamId}`} className="hover:text-[#0f2d52]">
                  {player.teamName}
                </Link>
                {player.teamCity && player.teamState && ` • ${player.teamCity}, ${player.teamState}`}
              </p>
              {player.position && (
                <span className="inline-flex items-center px-2 py-1 mt-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {player.position}
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={() => setEditing(!editing)}
            variant={editing ? 'outline' : 'default'}
            className={editing ? '' : 'bg-[#0f2d52] hover:bg-[#1a4a7a]'}
          >
            {editing ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Player
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Player Details / Edit Form */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Player Details</h2>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={form.jerseyNumber}
                    onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Team
                </label>
                <select
                  value={form.sportsTeamId}
                  onChange={(e) => setForm({ ...form, sportsTeamId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {allTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.sport})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position
                  </label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Position</option>
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year
                  </label>
                  <select
                    value={form.yearGrade}
                    onChange={(e) => setForm({ ...form, yearGrade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Year</option>
                    {YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Height
                  </label>
                  <input
                    type="text"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                    placeholder="e.g., 6'2&quot;"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    placeholder="e.g., 185"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#0f2d52] hover:bg-[#1a4a7a]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Jersey Number</div>
                <div className="font-medium text-gray-900 dark:text-white">#{player.jerseyNumber}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Name</div>
                <div className="font-medium text-gray-900 dark:text-white">{player.name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Position</div>
                <div className="font-medium text-gray-900 dark:text-white">{player.position || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Year</div>
                <div className="font-medium text-gray-900 dark:text-white">{player.yearGrade || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Height</div>
                <div className="font-medium text-gray-900 dark:text-white">{player.height || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Weight</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {player.weight ? `${player.weight} lbs` : '-'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Stats */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Video className="w-4 h-4" />
                  <span>Games Analyzed</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{stats.gamesPlayed}</span>
              </div>
              {stats.averageGrade !== null && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>Average Grade</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {stats.averageGrade.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Trophy className="w-4 h-4" />
                      <span>Best Grade</span>
                    </div>
                    <span className="font-bold text-green-600">{stats.highestGrade?.toFixed(1)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Team Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team</h2>
            <Link href={`/admin/teams/${player.sportsTeamId}`} className="block hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white">{player.teamName}</div>
              {player.teamCity && player.teamState && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {player.teamCity}, {player.teamState}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {player.teamJerseyColorHome && (
                  <div className="flex items-center gap-1">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: player.teamJerseyColorHome.toLowerCase() }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Home</span>
                  </div>
                )}
                {player.teamJerseyColorAway && (
                  <div className="flex items-center gap-1">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: player.teamJerseyColorAway.toLowerCase() }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Away</span>
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Game History */}
      {gameAppearances.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Game History</h2>
          <div className="space-y-3">
            {gameAppearances.map((game) => (
              <Link
                key={game.detectedPlayerId}
                href={`/game/${game.gameId}`}
                className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-650"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {game.gameName || 'Untitled Game'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {game.opponent && `vs ${game.opponent}`}
                      {game.gameDate && ` • ${new Date(game.gameDate).toLocaleDateString()}`}
                    </div>
                  </div>
                  {game.overallGrade && (
                    <div
                      className={`text-xl font-bold ${
                        parseFloat(game.overallGrade) >= 80
                          ? 'text-green-600'
                          : parseFloat(game.overallGrade) >= 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {parseFloat(game.overallGrade).toFixed(0)}
                    </div>
                  )}
                </div>
                {game.summary && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {game.summary}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
