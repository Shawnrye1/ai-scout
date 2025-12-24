'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  X,
  AlertCircle,
  ArrowLeft,
  Settings,
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
}

interface Team {
  id: number;
  name: string;
  sport: string;
  city: string | null;
  state: string | null;
  conference: string | null;
  division: string | null;
  jerseyColorHome: string | null;
  jerseyColorAway: string | null;
}

const POSITIONS = {
  basketball: ['PG', 'SG', 'SF', 'PF', 'C'],
  football: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'],
};

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', '5th Year'];

function EditTeamModal({
  team,
  onClose,
  onSaved,
}: {
  team: Team;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: team.name,
    sport: team.sport,
    city: team.city || '',
    state: team.state || '',
    jerseyColorHome: team.jerseyColorHome || '',
    jerseyColorAway: team.jerseyColorAway || '',
    conference: team.conference || '',
    division: team.division || '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: team.id, ...form }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update team');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sport</label>
              <select
                value={form.sport}
                onChange={(e) => setForm({ ...form, sport: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              >
                <option value="basketball">Basketball</option>
                <option value="football">Football</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Division</label>
              <input
                type="text"
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Home Jersey Color</label>
              <input
                type="text"
                value={form.jerseyColorHome}
                onChange={(e) => setForm({ ...form, jerseyColorHome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Away Jersey Color</label>
              <input
                type="text"
                value={form.jerseyColorAway}
                onChange={(e) => setForm({ ...form, jerseyColorAway: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conference</label>
            <input
              type="text"
              value={form.conference}
              onChange={(e) => setForm({ ...form, conference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#0f2d52] hover:bg-[#1a4a7a]" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  sport,
  onEdit,
  onDelete,
}: {
  player: Player;
  sport: string;
  onEdit: (player: Player) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
      <td className="py-3 px-4">
        <div className="w-10 h-10 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold">
          {player.jerseyNumber}
        </div>
      </td>
      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{player.name || '-'}</td>
      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{player.position || '-'}</td>
      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{player.height || '-'}</td>
      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{player.weight ? `${player.weight} lbs` : '-'}</td>
      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{player.yearGrade || '-'}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(player)}
            className="p-1.5 text-gray-400 hover:text-[#0f2d52] hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(player.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PlayerForm({
  player,
  sport,
  onSave,
  onCancel,
  loading,
}: {
  player: Partial<Player> | null;
  sport: string;
  onSave: (data: Partial<Player>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    jerseyNumber: player?.jerseyNumber?.toString() || '',
    name: player?.name || '',
    position: player?.position || '',
    height: player?.height || '',
    weight: player?.weight?.toString() || '',
    yearGrade: player?.yearGrade || '',
  });

  const positions = POSITIONS[sport as keyof typeof POSITIONS] || POSITIONS.basketball;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
      <td className="py-3 px-4">
        <input
          type="number"
          min="0"
          max="99"
          value={form.jerseyNumber}
          onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
          placeholder="#"
          className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Player Name"
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </td>
      <td className="py-3 px-4">
        <select
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Position</option>
          {positions.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4">
        <input
          type="text"
          value={form.height}
          onChange={(e) => setForm({ ...form, height: e.target.value })}
          placeholder="6'2&quot;"
          className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: e.target.value })}
          placeholder="180"
          className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </td>
      <td className="py-3 px-4">
        <select
          value={form.yearGrade}
          onChange={(e) => setForm({ ...form, yearGrade: e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Year</option>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onSave({
                ...form,
                jerseyNumber: parseInt(form.jerseyNumber),
                weight: form.weight ? parseInt(form.weight) : undefined,
              })
            }
            disabled={loading || !form.jerseyNumber}
            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminTeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showEditTeam, setShowEditTeam] = useState(false);

  const { data, isLoading, error } = useSWR(`/api/admin/teams/${teamId}/players`, fetcher);

  const team: Team | null = data?.team;
  const players: Player[] = data?.players || [];

  async function handleSavePlayer(playerData: Partial<Player>) {
    setSaving(true);
    setActionError('');

    try {
      const isEdit = editingPlayer?.id;
      const res = await fetch(`/api/admin/teams/${teamId}/players`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingPlayer.id, ...playerData } : playerData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save player');
      }

      mutate(`/api/admin/teams/${teamId}/players`);
      setEditingPlayer(null);
      setAddingPlayer(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlayer(id: number) {
    if (!confirm('Are you sure you want to remove this player?')) return;

    try {
      const res = await fetch(`/api/admin/teams/${teamId}/players?playerId=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete player');
      }
      mutate(`/api/admin/teams/${teamId}/players`);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="bg-red-50 text-red-600 rounded-lg p-4">
        Failed to load team. Please try again.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/teams"
          className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {team.city && team.state ? `${team.city}, ${team.state} • ` : ''}
              <span className="capitalize">{team.sport}</span>
              {team.conference && ` • ${team.conference}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {team.jerseyColorHome && (
              <div className="text-center">
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: team.jerseyColorHome.toLowerCase() }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Home</span>
              </div>
            )}
            {team.jerseyColorAway && (
              <div className="text-center">
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: team.jerseyColorAway.toLowerCase() }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Away</span>
              </div>
            )}
            <Button
              onClick={() => setShowEditTeam(true)}
              variant="outline"
              size="sm"
            >
              <Settings className="w-4 h-4 mr-1" />
              Edit Team
            </Button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {actionError}
          <button onClick={() => setActionError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Players Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Roster ({players.length} players)
          </h3>
          <Button
            onClick={() => {
              setAddingPlayer(true);
              setEditingPlayer(null);
            }}
            size="sm"
            className="bg-[#0f2d52] hover:bg-[#1a4a7a]"
            disabled={addingPlayer}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Player
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 font-medium">#</th>
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Position</th>
                <th className="py-3 px-4 font-medium">Height</th>
                <th className="py-3 px-4 font-medium">Weight</th>
                <th className="py-3 px-4 font-medium">Year</th>
                <th className="py-3 px-4 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {addingPlayer && (
                <PlayerForm
                  player={null}
                  sport={team.sport}
                  onSave={handleSavePlayer}
                  onCancel={() => setAddingPlayer(false)}
                  loading={saving}
                />
              )}
              {players.map((player) =>
                editingPlayer?.id === player.id ? (
                  <PlayerForm
                    key={player.id}
                    player={player}
                    sport={team.sport}
                    onSave={handleSavePlayer}
                    onCancel={() => setEditingPlayer(null)}
                    loading={saving}
                  />
                ) : (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    sport={team.sport}
                    onEdit={setEditingPlayer}
                    onDelete={handleDeletePlayer}
                  />
                )
              )}
              {players.length === 0 && !addingPlayer && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    No players on roster. Add your first player above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Team Modal */}
      {showEditTeam && team && (
        <EditTeamModal
          team={team}
          onClose={() => setShowEditTeam(false)}
          onSaved={() => mutate(`/api/admin/teams/${teamId}/players`)}
        />
      )}
    </div>
  );
}
