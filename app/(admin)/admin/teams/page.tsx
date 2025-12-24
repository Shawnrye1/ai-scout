'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import {
  Users,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  playerCount: number;
}

function CreateTeamModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    sport: 'basketball',
    city: '',
    state: '',
    jerseyColorHome: '',
    jerseyColorAway: '',
    conference: '',
    division: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create team');
      }

      onCreated();
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Team to Database</h2>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Central High School"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sport *</label>
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
                placeholder="e.g., 4A"
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
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="State"
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
                placeholder="e.g., White"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Away Jersey Color</label>
              <input
                type="text"
                value={form.jerseyColorAway}
                onChange={(e) => setForm({ ...form, jerseyColorAway: e.target.value })}
                placeholder="e.g., Blue"
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
              placeholder="e.g., Metro League"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#0f2d52] hover:bg-[#1a4a7a]" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Team
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminTeamsPage() {
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, error } = useSWR(
    `/api/admin/teams?search=${encodeURIComponent(search)}&sport=${sportFilter}`,
    fetcher
  );

  const teams: Team[] = data?.teams || [];

  async function handleDeleteTeam(teamId: number, teamName: string) {
    if (!confirm(`Are you sure you want to delete "${teamName}" and all its players?`)) return;

    try {
      const res = await fetch(`/api/admin/teams?id=${teamId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete team');
      mutate(`/api/admin/teams?search=${encodeURIComponent(search)}&sport=${sportFilter}`);
    } catch (err) {
      alert('Failed to delete team');
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Database</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage all teams and their rosters for game analysis
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search teams by name, city, conference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
          >
            <option value="">All Sports</option>
            <option value="basketball">Basketball</option>
            <option value="football">Football</option>
          </select>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#0f2d52] hover:bg-[#1a4a7a]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Team
          </Button>
        </div>
      </div>

      {/* Teams List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          Failed to load teams. Please try again.
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {search ? 'No teams match your search' : 'No teams in database yet'}
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 bg-[#0f2d52] hover:bg-[#1a4a7a]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Team
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 font-medium">Team</th>
                <th className="py-3 px-4 font-medium">Location</th>
                <th className="py-3 px-4 font-medium">Sport</th>
                <th className="py-3 px-4 font-medium">Players</th>
                <th className="py-3 px-4 font-medium">Jersey Colors</th>
                <th className="py-3 px-4 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <td className="py-3 px-4">
                    <Link href={`/admin/teams/${team.id}`} className="hover:text-[#0f2d52]">
                      <div className="font-medium text-gray-900 dark:text-white">{team.name}</div>
                      {team.conference && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{team.conference}</div>
                      )}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {team.city && team.state ? `${team.city}, ${team.state}` : team.city || team.state || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                      {team.sport}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {team.playerCount} players
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {team.jerseyColorHome && (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                            style={{ backgroundColor: team.jerseyColorHome.toLowerCase() }}
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">H</span>
                        </div>
                      )}
                      {team.jerseyColorAway && (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                            style={{ backgroundColor: team.jerseyColorAway.toLowerCase() }}
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">A</span>
                        </div>
                      )}
                      {!team.jerseyColorHome && !team.jerseyColorAway && '-'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/teams/${team.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#0f2d52] hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteTeam(team.id, team.name)}
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
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => mutate(`/api/admin/teams?search=${encodeURIComponent(search)}&sport=${sportFilter}`)}
        />
      )}
    </div>
  );
}
