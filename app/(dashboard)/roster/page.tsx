'use client';

import { useState, useRef } from 'react';
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
  Upload,
  FileSpreadsheet,
  Check,
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

interface SportsTeam {
  id: number;
  name: string;
  sport: string;
  jerseyColorHome: string | null;
  jerseyColorAway: string | null;
  city: string | null;
  state: string | null;
}

const POSITIONS = {
  basketball: ['PG', 'SG', 'SF', 'PF', 'C'],
  football: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'],
};

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', '5th Year'];

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
      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createTeam', ...form }),
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
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Create Your Team</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Lincoln High School"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sport *</label>
              <select
                value={form.sport}
                onChange={(e) => setForm({ ...form, sport: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              >
                <option value="basketball">Basketball</option>
                <option value="football">Football</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
              <input
                type="text"
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value })}
                placeholder="e.g., 4A, Division I"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Home Jersey Color</label>
              <input
                type="text"
                value={form.jerseyColorHome}
                onChange={(e) => setForm({ ...form, jerseyColorHome: e.target.value })}
                placeholder="e.g., White, Red"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Away Jersey Color</label>
              <input
                type="text"
                value={form.jerseyColorAway}
                onChange={(e) => setForm({ ...form, jerseyColorAway: e.target.value })}
                placeholder="e.g., Blue, Black"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conference</label>
            <input
              type="text"
              value={form.conference}
              onChange={(e) => setForm({ ...form, conference: e.target.value })}
              placeholder="e.g., Metro League"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#0f2d52] hover:bg-[#1a4a7a]" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Team
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ParsedPlayer {
  jerseyNumber: number;
  name: string;
  position?: string;
  height?: string;
  weight?: number;
  yearGrade?: string;
}

function parseCSV(text: string): ParsedPlayer[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const jerseyIdx = header.findIndex(h => h.includes('jersey') || h.includes('number') || h === '#' || h === 'no');
  const nameIdx = header.findIndex(h => h.includes('name') || h.includes('player'));
  const posIdx = header.findIndex(h => h.includes('pos') || h.includes('position'));
  const heightIdx = header.findIndex(h => h.includes('height') || h.includes('ht'));
  const weightIdx = header.findIndex(h => h.includes('weight') || h.includes('wt'));
  const yearIdx = header.findIndex(h => h.includes('year') || h.includes('grade') || h.includes('class'));

  if (jerseyIdx === -1 && nameIdx === -1) return [];

  const players: ParsedPlayer[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

    // Try to extract jersey number
    let jerseyNumber = 0;
    if (jerseyIdx !== -1 && cols[jerseyIdx]) {
      const num = parseInt(cols[jerseyIdx].replace(/\D/g, ''));
      if (!isNaN(num) && num >= 0 && num <= 99) jerseyNumber = num;
    }

    // Extract name
    const name = nameIdx !== -1 ? cols[nameIdx] : '';

    if (!jerseyNumber && !name) continue;

    // Extract other fields
    let weight: number | undefined;
    if (weightIdx !== -1 && cols[weightIdx]) {
      const w = parseInt(cols[weightIdx].replace(/\D/g, ''));
      if (!isNaN(w) && w > 0) weight = w;
    }

    players.push({
      jerseyNumber: jerseyNumber || 0,
      name: name || `Player #${jerseyNumber}`,
      position: posIdx !== -1 ? cols[posIdx] : undefined,
      height: heightIdx !== -1 ? cols[heightIdx] : undefined,
      weight,
      yearGrade: yearIdx !== -1 ? cols[yearIdx] : undefined,
    });
  }

  return players;
}

function UploadRosterModal({
  sport,
  onClose,
  onImport,
}: {
  sport: string;
  onClose: () => void;
  onImport: (players: ParsedPlayer[]) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayer[]>([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError('');

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const players = parseCSV(text);

      if (players.length === 0) {
        setError('No players found. Make sure your CSV has columns for jersey number and name.');
        return;
      }

      setParsedPlayers(players);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      await onImport(parsedPlayers);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import players');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload Roster</h2>
            <p className="text-sm text-gray-500 mt-1">Import players from a CSV file</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {parsedPlayers.length === 0 ? (
            <>
              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive ? 'border-[#0f2d52] bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium mb-2">
                  Drag and drop your roster file here
                </p>
                <p className="text-sm text-gray-500 mb-4">or</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {/* Format Help */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">CSV Format</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Your CSV should have headers like:
                </p>
                <code className="block bg-white p-3 rounded border text-xs text-gray-700 overflow-x-auto">
                  Jersey,Name,Position,Height,Weight,Year{'\n'}
                  23,Michael Jordan,SG,6&apos;6&quot;,195,Senior{'\n'}
                  33,Scottie Pippen,SF,6&apos;8&quot;,210,Senior
                </code>
                <p className="text-xs text-gray-500 mt-2">
                  At minimum, include &quot;Jersey&quot; or &quot;Number&quot; and &quot;Name&quot; columns.
                </p>
              </div>
            </>
          ) : (
            /* Preview parsed players */
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">{parsedPlayers.length} players found</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParsedPlayers([])}
                >
                  Upload Different File
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-500">
                      <th className="py-2 px-3 font-medium">#</th>
                      <th className="py-2 px-3 font-medium">Name</th>
                      <th className="py-2 px-3 font-medium">Position</th>
                      <th className="py-2 px-3 font-medium">Height</th>
                      <th className="py-2 px-3 font-medium">Weight</th>
                      <th className="py-2 px-3 font-medium">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPlayers.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 px-3 font-medium">{p.jerseyNumber}</td>
                        <td className="py-2 px-3">{p.name}</td>
                        <td className="py-2 px-3">{p.position || '-'}</td>
                        <td className="py-2 px-3">{p.height || '-'}</td>
                        <td className="py-2 px-3">{p.weight || '-'}</td>
                        <td className="py-2 px-3">{p.yearGrade || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            className="bg-[#0f2d52] hover:bg-[#1a4a7a]"
            disabled={parsedPlayers.length === 0 || importing}
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Import {parsedPlayers.length} Players
          </Button>
        </div>
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
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="w-10 h-10 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold">
          {player.jerseyNumber}
        </div>
      </td>
      <td className="py-3 px-4 font-medium text-gray-900">{player.name || '-'}</td>
      <td className="py-3 px-4 text-gray-600">{player.position || '-'}</td>
      <td className="py-3 px-4 text-gray-600">{player.height || '-'}</td>
      <td className="py-3 px-4 text-gray-600">{player.weight ? `${player.weight} lbs` : '-'}</td>
      <td className="py-3 px-4 text-gray-600">{player.yearGrade || '-'}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(player)}
            className="p-1.5 text-gray-400 hover:text-[#0f2d52] hover:bg-gray-100 rounded"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(player.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
    <tr className="border-b border-gray-100 bg-blue-50">
      <td className="py-3 px-4">
        <input
          type="number"
          min="0"
          max="99"
          value={form.jerseyNumber}
          onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
          placeholder="#"
          className="w-16 px-2 py-1.5 border border-gray-300 rounded text-center"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Player Name"
          className="w-full px-2 py-1.5 border border-gray-300 rounded"
        />
      </td>
      <td className="py-3 px-4">
        <select
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-300 rounded"
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
          className="w-20 px-2 py-1.5 border border-gray-300 rounded"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: e.target.value })}
          placeholder="180"
          className="w-20 px-2 py-1.5 border border-gray-300 rounded"
        />
      </td>
      <td className="py-3 px-4">
        <select
          value={form.yearGrade}
          onChange={(e) => setForm({ ...form, yearGrade: e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-300 rounded"
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
            onClick={() => onSave({ ...form, jerseyNumber: parseInt(form.jerseyNumber), weight: form.weight ? parseInt(form.weight) : undefined })}
            disabled={loading || !form.jerseyNumber}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function RosterPage() {
  const { data, error, isLoading } = useSWR('/api/roster', fetcher);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const sportsTeam: SportsTeam | null = data?.sportsTeam;
  const players: Player[] = data?.players || [];
  const sport = sportsTeam?.sport || 'basketball';

  async function handleSavePlayer(playerData: Partial<Player>) {
    setSaving(true);
    setActionError('');

    try {
      const isEdit = editingPlayer?.id;
      const res = await fetch('/api/roster', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingPlayer.id, ...playerData } : playerData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save player');
      }

      mutate('/api/roster');
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
      const res = await fetch(`/api/roster?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete player');
      }
      mutate('/api/roster');
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  async function handleImportPlayers(importedPlayers: ParsedPlayer[]) {
    // Import players one by one
    for (const player of importedPlayers) {
      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jerseyNumber: player.jerseyNumber,
          name: player.name,
          position: player.position,
          height: player.height,
          weight: player.weight,
          yearGrade: player.yearGrade,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to import player ${player.name}`);
      }
    }

    mutate('/api/roster');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Team Roster</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Manage your team's players for accurate game analysis
          </p>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          Failed to load roster. Please try again.
        </div>
      ) : !sportsTeam ? (
        /* No team linked - show create team prompt */
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Set Up</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create your team to start managing your roster. This helps us identify players
            correctly when analyzing game film.
          </p>
          <Button
            onClick={() => setShowCreateTeam(true)}
            className="bg-[#0f2d52] hover:bg-[#1a4a7a]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your Team
          </Button>
        </div>
      ) : (
        /* Team exists - show roster */
        <div>
          {/* Team Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{sportsTeam.name}</h2>
                <p className="text-sm text-gray-500">
                  {sportsTeam.city && sportsTeam.state
                    ? `${sportsTeam.city}, ${sportsTeam.state} • `
                    : ''}
                  {sportsTeam.sport.charAt(0).toUpperCase() + sportsTeam.sport.slice(1)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {sportsTeam.jerseyColorHome && (
                  <div className="text-center">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-200"
                      style={{ backgroundColor: sportsTeam.jerseyColorHome.toLowerCase() }}
                    />
                    <span className="text-xs text-gray-500">Home</span>
                  </div>
                )}
                {sportsTeam.jerseyColorAway && (
                  <div className="text-center">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-200"
                      style={{ backgroundColor: sportsTeam.jerseyColorAway.toLowerCase() }}
                    />
                    <span className="text-xs text-gray-500">Away</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Players ({players.length})
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowUpload(true)}
                  size="sm"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Roster
                </Button>
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
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-sm text-gray-500">
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
                      sport={sport}
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
                        sport={sport}
                        onSave={handleSavePlayer}
                        onCancel={() => setEditingPlayer(null)}
                        loading={saving}
                      />
                    ) : (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        sport={sport}
                        onEdit={setEditingPlayer}
                        onDelete={handleDeletePlayer}
                      />
                    )
                  )}
                  {players.length === 0 && !addingPlayer && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No players on roster. Add your first player above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tip */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <strong>Tip:</strong> Adding your full roster helps AI Scout correctly identify players
            in game film by matching jersey numbers to player names.
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeam && (
        <CreateTeamModal
          onClose={() => setShowCreateTeam(false)}
          onCreated={() => mutate('/api/roster')}
        />
      )}

      {/* Upload Roster Modal */}
      {showUpload && (
        <UploadRosterModal
          sport={sport}
          onClose={() => setShowUpload(false)}
          onImport={handleImportPlayers}
        />
      )}
    </div>
  );
}
