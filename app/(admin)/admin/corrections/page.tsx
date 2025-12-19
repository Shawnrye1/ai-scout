'use client';

import { useState, useEffect } from 'react';
import {
  Flag,
  Check,
  X,
  ChevronDown,
  Play,
  Filter,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface FlaggedItem {
  id: string;
  gameId: string;
  gameName: string;
  playType: string;
  timestamp: number;
  duration: number;
  confidence: number;
  flagReason: string;
  flaggedBy: string;
  flaggedAt: string;
  videoUrl?: string;
  detectedFormation?: string;
  suggestedFormation?: string;
  players: {
    id: string;
    jerseyNumber: string;
    team: string;
    detectedPosition?: string;
  }[];
}

const PLAY_TYPES = [
  'Pass Play',
  'Run Play',
  'Screen Play',
  'Play Action',
  'Draw Play',
  'Zone Read',
  'RPO',
  '3-Point Attempt',
  'Drive',
  'Fast Break',
  'Pick and Roll',
  'Post Up',
  'Transition',
  'Half Court Set',
];

const FORMATIONS = {
  football: [
    'Shotgun',
    'Under Center',
    'Pistol',
    'I Formation',
    'Single Back',
    'Empty',
    'Wildcat',
  ],
  basketball: [
    'Motion Offense',
    'Pick and Roll',
    'Isolation',
    'Post Up',
    'Transition',
    'Zone Attack',
    '1-4 High',
    'Horns',
  ],
};

export default function CorrectionsQueue() {
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'low_confidence' | 'flagged'>('all');
  const [corrections, setCorrections] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchFlaggedItems();
  }, [filter]);

  async function fetchFlaggedItems() {
    try {
      const res = await fetch(`/api/admin/corrections?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch corrections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function submitCorrection(itemId: string) {
    const correction = corrections[itemId];
    if (!correction) return;

    try {
      const res = await fetch('/api/admin/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playId: itemId,
          corrections: correction,
        }),
      });

      if (res.ok) {
        // Remove from list
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        setSelectedItem(null);
        setCorrections((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to submit correction:', error);
    }
  }

  async function dismissItem(itemId: string) {
    try {
      const res = await fetch(`/api/admin/corrections/${itemId}/dismiss`, {
        method: 'POST',
      });

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        if (selectedItem?.id === itemId) {
          setSelectedItem(null);
        }
      }
    } catch (error) {
      console.error('Failed to dismiss item:', error);
    }
  }

  function updateCorrection(itemId: string, field: string, value: any) {
    setCorrections((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* List Panel */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Correction Queue</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and correct AI detections to improve model accuracy
          </p>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                filter === 'all'
                  ? 'bg-[#0f2d52] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('low_confidence')}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                filter === 'low_confidence'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Low Confidence
            </button>
            <button
              onClick={() => setFilter('flagged')}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                filter === 'flagged'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Flag className="w-3 h-3" />
              Flagged
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">All caught up!</p>
              <p className="text-sm text-gray-500 mt-1">
                No items need review right now
              </p>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${
                  selectedItem?.id === item.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {item.playType || 'Unknown Play'}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {item.gameName}
                    </div>
                  </div>
                  <div
                    className={`px-2 py-0.5 text-xs rounded ${
                      item.confidence < 60
                        ? 'bg-red-100 text-red-700'
                        : item.confidence < 80
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {item.confidence}%
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(item.timestamp)}
                  </span>
                  {item.flagReason && (
                    <span className="flex items-center gap-1 text-orange-600">
                      <Flag className="w-3 h-3" />
                      {item.flagReason}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {selectedItem ? (
          <div className="p-6">
            {/* Video Preview */}
            <div className="bg-black rounded-lg aspect-video mb-6 flex items-center justify-center">
              {selectedItem.videoUrl ? (
                <video
                  src={selectedItem.videoUrl}
                  controls
                  className="w-full h-full rounded-lg"
                />
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <Play className="w-12 h-12 mb-2" />
                  <span>Video preview unavailable</span>
                </div>
              )}
            </div>

            {/* Correction Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Make Corrections
              </h2>

              <div className="space-y-4">
                {/* Play Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Play Type
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">AI detected:</span>
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {selectedItem.playType || 'Unknown'}
                    </span>
                  </div>
                  <select
                    value={corrections[selectedItem.id]?.playType || ''}
                    onChange={(e) =>
                      updateCorrection(selectedItem.id, 'playType', e.target.value)
                    }
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
                  >
                    <option value="">Keep current</option>
                    {PLAY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Formation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formation
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">AI detected:</span>
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {selectedItem.detectedFormation || 'Unknown'}
                    </span>
                  </div>
                  <select
                    value={corrections[selectedItem.id]?.formation || ''}
                    onChange={(e) =>
                      updateCorrection(selectedItem.id, 'formation', e.target.value)
                    }
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
                  >
                    <option value="">Keep current</option>
                    <optgroup label="Football">
                      {FORMATIONS.football.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Basketball">
                      {FORMATIONS.basketball.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Player Assignments */}
                {selectedItem.players.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Player Assignments
                    </label>
                    <div className="space-y-2">
                      {selectedItem.players.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold">
                            {player.jerseyNumber}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{player.team}</div>
                            <div className="text-xs text-gray-500">
                              Detected: {player.detectedPosition || 'Unknown'}
                            </div>
                          </div>
                          <select
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0f2d52]"
                            value={
                              corrections[selectedItem.id]?.players?.[player.id] || ''
                            }
                            onChange={(e) => {
                              const currentPlayers =
                                corrections[selectedItem.id]?.players || {};
                              updateCorrection(selectedItem.id, 'players', {
                                ...currentPlayers,
                                [player.id]: e.target.value,
                              });
                            }}
                          >
                            <option value="">Keep</option>
                            <option value="wrong_team">Wrong Team</option>
                            <option value="wrong_number">Wrong Jersey #</option>
                            <option value="not_player">Not a Player</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={corrections[selectedItem.id]?.notes || ''}
                    onChange={(e) =>
                      updateCorrection(selectedItem.id, 'notes', e.target.value)
                    }
                    placeholder="Additional context for this correction..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52] resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => dismissItem(selectedItem.id)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Dismiss
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitCorrection(selectedItem.id)}
                    className="px-4 py-2 bg-[#0f2d52] text-white rounded-lg hover:bg-[#1a3d62] flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Submit Correction
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Select an item to review</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
