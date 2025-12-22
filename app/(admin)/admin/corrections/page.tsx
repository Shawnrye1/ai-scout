'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Flag,
  Check,
  X,
  ChevronDown,
  Play,
  Filter,
  Clock,
  AlertTriangle,
  Users,
  ExternalLink,
  Loader2
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
  hasPlayerAnnotations?: boolean;
  playerAnnotationCount?: number;
  players: {
    id: string;
    jerseyNumber: string;
    team: string;
    detectedPosition?: string;
  }[];
}

interface Gap {
  startTime: number;
  endTime: number;
  duration: number;
  afterPlayNumber: number | null;
  beforePlayNumber: number | null;
}

interface CoverageData {
  gameId: string;
  gameName: string;
  videoDuration: number;
  totalPlays: number;
  gaps: Gap[];
  coverage: {
    coveredTime: number;
    uncoveredTime: number;
    percentage: number;
  };
}

const PLAY_TYPES = {
  football: [
    'Pass Play',
    'Run Play',
    'Screen Play',
    'Play Action',
    'Draw Play',
    'Zone Read',
    'RPO',
    'Punt',
    'Field Goal',
    'Kickoff',
    'Timeout',
    'Dead Ball',
  ],
  basketball: [
    '3-Point Attempt',
    'Mid-Range Shot',
    'Layup',
    'Dunk',
    'Drive',
    'Fast Break',
    'Pick and Roll',
    'Post Up',
    'Isolation',
    'Transition',
    'Half Court Set',
    'Out of Bounds',
    'Free Throw',
    'Turnover',
    'Timeout',
    'Dead Ball',
  ],
};

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
  const [phaseFilter, setPhaseFilter] = useState<'segment' | 'analyze'>('segment');
  const [corrections, setCorrections] = useState<Record<string, any>>({});
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);

  // Label Studio integration state
  const [labelStudioStatus, setLabelStudioStatus] = useState<{
    connected: boolean;
    projectUrl?: string;
    error?: string;
  } | null>(null);
  const [sendingToLabelStudio, setSendingToLabelStudio] = useState(false);

  useEffect(() => {
    fetchFlaggedItems();
  }, [filter, phaseFilter]);

  // Check Label Studio connection on mount
  useEffect(() => {
    async function checkLabelStudio() {
      try {
        const res = await fetch('/api/admin/labelstudio');
        const data = await res.json();
        setLabelStudioStatus({
          connected: data.connected,
          projectUrl: data.project?.url,
          error: data.error,
        });
      } catch {
        setLabelStudioStatus({ connected: false, error: 'Failed to check connection' });
      }
    }
    checkLabelStudio();
  }, []);

  // Send clip to Label Studio for player annotation
  async function sendToLabelStudio(playId: string) {
    setSendingToLabelStudio(true);
    try {
      const res = await fetch('/api/admin/labelstudio/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playId }),
      });
      const data = await res.json();
      if (data.success) {
        // Open Label Studio in new tab
        window.open(data.taskUrl, '_blank');
      } else {
        alert(`Failed to send: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to send to Label Studio');
    } finally {
      setSendingToLabelStudio(false);
    }
  }

  // Keyboard shortcuts for boundary marking
  useEffect(() => {
    if (!selectedItem || phaseFilter !== 'segment') return;
    if (corrections[selectedItem.id]?.segmentationCorrect !== false) return;

    const itemId = selectedItem.id; // Capture for closure

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const time = Math.round(currentTime * 2) / 2; // Round to nearest 0.5s

      if (e.code === 'Space') {
        e.preventDefault();
        // Add split point at current time
        const currentSplits = corrections[itemId]?.splitPoints || '';
        const splitArray = currentSplits ? currentSplits.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        if (!splitArray.includes(String(time))) {
          splitArray.push(String(time));
          splitArray.sort((a: string, b: string) => parseFloat(a) - parseFloat(b));
          updateCorrection(itemId, 'splitPoints', splitArray.join(', '));
          updateCorrection(itemId, 'hasMultiplePlays', true);
        }
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        // Set start marker
        updateCorrection(itemId, 'actualStartTime', time);
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        // Set end marker
        updateCorrection(itemId, 'actualEndTime', time);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, phaseFilter, currentTime, corrections]);

  // Use proxy video URL to avoid CORS issues with R2
  useEffect(() => {
    if (selectedItem?.gameId) {
      // Use the proxy endpoint directly - no need to fetch URL
      setVideoUrl(`/api/video/${selectedItem.gameId}?proxy=true`);
      setVideoLoading(false);
    } else {
      setVideoUrl(null);
    }
  }, [selectedItem?.gameId]);

  // Fetch coverage data when a play is selected
  useEffect(() => {
    async function fetchCoverage() {
      if (!selectedItem?.gameId) {
        setCoverage(null);
        return;
      }

      setCoverageLoading(true);
      try {
        const res = await fetch(`/api/games/${selectedItem.gameId}/coverage`);
        if (res.ok) {
          const data = await res.json();
          setCoverage(data);
        }
      } catch (error) {
        console.error('Failed to fetch coverage:', error);
      } finally {
        setCoverageLoading(false);
      }
    }

    fetchCoverage();
  }, [selectedItem?.gameId]);

  async function fetchFlaggedItems() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/corrections?phase=${phaseFilter}&filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        // Clear selection when switching phases
        setSelectedItem(null);
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

  // Send play back to segmentation queue (from analysis queue)
  async function sendBackToSegmentation(itemId: string) {
    try {
      const res = await fetch('/api/admin/corrections/send-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playId: itemId }),
      });

      if (res.ok) {
        // Remove from analysis queue - it will appear in segmentation queue
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setSelectedItem(null);
      } else {
        const error = await res.json();
        console.error('Failed to send back:', error);
      }
    } catch (error) {
      console.error('Failed to send back:', error);
    }
  }

  // Approve boundaries as correct (moves play to analysis queue)
  async function approveBoundaries(itemId: string) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    try {
      const res = await fetch('/api/admin/corrections/boundaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playId: itemId,
          gameId: item.gameId,
          originalStart: item.timestamp,
          originalEnd: item.timestamp + item.duration,
          correctedStart: item.timestamp, // Keep same start
          correctedEnd: item.timestamp + item.duration, // Keep same end
          splitPoints: [],
          hasMultiplePlays: false,
          notes: 'Boundaries approved as correct',
        }),
      });

      if (res.ok) {
        // Remove from segmentation queue - it will appear in analysis queue
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setSelectedItem(null);
      } else {
        const error = await res.json();
        console.error('Failed to approve boundaries:', error);
      }
    } catch (error) {
      console.error('Failed to approve boundaries:', error);
    }
  }

  // Submit boundary corrections (Phase 1)
  // If split points are provided, creates new plays from the segments
  async function submitBoundaryCorrection(itemId: string) {
    const correction = corrections[itemId];
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Use corrected boundaries if set, otherwise use original
    const startTime = correction?.actualStartTime ?? item.timestamp;
    const endTime = correction?.actualEndTime ?? (item.timestamp + item.duration);
    const splitPointsArray = correction?.splitPoints
      ? correction.splitPoints.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n))
      : [];

    try {
      const res = await fetch('/api/admin/corrections/boundaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playId: itemId,
          gameId: item.gameId,
          originalStart: item.timestamp,
          originalEnd: item.timestamp + item.duration,
          correctedStart: startTime,
          correctedEnd: endTime,
          splitPoints: splitPointsArray,
          hasMultiplePlays: splitPointsArray.length > 0,
          notes: correction?.notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Remove the original item from the list
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setSelectedItem(null);
        setCorrections((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });

        // If new plays were created, refresh the list to show them
        if (data.newPlays && data.newPlays.length > 0) {
          // Re-fetch the items to get the new plays
          fetchFlaggedItems();
        }
      } else {
        const error = await res.json();
        console.error('Failed to submit boundary correction:', error);
      }
    } catch (error) {
      console.error('Failed to submit boundary correction:', error);
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
      <div className="w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Training Queue</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Train the AI model to become smarter over time
          </p>

          {/* Phase Tabs - Main workflow selector */}
          <div className="flex gap-1 mt-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => setPhaseFilter('segment')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                phaseFilter === 'segment'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
                Segment
              </span>
            </button>
            <button
              onClick={() => setPhaseFilter('analyze')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                phaseFilter === 'analyze'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
                Analyze
              </span>
            </button>
          </div>

          {/* Phase description */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {phaseFilter === 'segment'
              ? 'Mark where plays start/end. Split if multiple plays.'
              : 'Label play types, events, and describe what happens.'
            }
          </p>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300">All caught up!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                No items need review right now
              </p>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedItem?.id === item.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.playType || 'Unknown Play'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
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
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(item.timestamp)}
                  </span>
                  {item.flagReason && (
                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
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
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        {selectedItem ? (
          <div className="p-6">
            {/* Video Preview */}
            <div className="bg-black rounded-lg aspect-video mb-6 flex items-center justify-center">
              {videoLoading ? (
                <div className="text-gray-400 flex flex-col items-center">
                  <div className="w-8 h-8 border-2 border-gray-400 border-t-white rounded-full animate-spin mb-2" />
                  <span>Loading video...</span>
                </div>
              ) : videoUrl ? (
                <div className="relative w-full h-full group">
                  {/* Video without native controls */}
                  <video
                    ref={videoRef}
                    key={`${selectedItem.id}`}
                    src={videoUrl}
                    className="w-full h-full rounded-lg cursor-pointer"
                    onClick={() => {
                      if (videoRef.current) {
                        if (videoRef.current.paused) {
                          videoRef.current.play();
                        } else {
                          videoRef.current.pause();
                        }
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        setVideoDuration(videoRef.current.duration);
                        if (selectedItem.timestamp) {
                          videoRef.current.currentTime = selectedItem.timestamp;
                        }
                      }
                    }}
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                        // Constrain playback to play boundaries
                        const playEnd = selectedItem.timestamp + selectedItem.duration;
                        if (videoRef.current.currentTime >= playEnd) {
                          videoRef.current.currentTime = selectedItem.timestamp;
                          videoRef.current.pause();
                        }
                      }
                    }}
                  />

                  {/* Play/Pause overlay */}
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ opacity: videoRef.current?.paused ? 1 : 0, transition: 'opacity 0.2s' }}
                  >
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                      <Play className="w-10 h-10 text-white ml-1" />
                    </div>
                  </div>

                  {/* Clip info overlay - top left */}
                  <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg">
                    <div className="font-semibold">Clip {selectedItem.playType || 'Play'}</div>
                    <div className="text-sm text-gray-300">{selectedItem.duration.toFixed(1)}s duration</div>
                  </div>

                  {/* Clip time display - top right */}
                  <div className="absolute top-4 right-4 bg-black/90 text-white px-4 py-2 rounded-lg font-mono text-xl font-bold shadow-lg">
                    {formatTimestamp(currentTime - selectedItem.timestamp)}
                    <span className="text-sm font-normal text-gray-400 ml-2">
                      / {formatTimestamp(selectedItem.duration)}
                    </span>
                  </div>

                  {/* Custom controls bar - bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    {/* Progress bar - only shows clip progress */}
                    <div
                      className="w-full h-2 bg-gray-600 rounded-full mb-3 cursor-pointer"
                      onClick={(e) => {
                        if (videoRef.current) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const percent = clickX / rect.width;
                          const clipTime = percent * selectedItem.duration;
                          videoRef.current.currentTime = selectedItem.timestamp + clipTime;
                        }
                      }}
                    >
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{
                          width: `${Math.max(0, Math.min(100, ((currentTime - selectedItem.timestamp) / selectedItem.duration) * 100))}%`
                        }}
                      />
                    </div>

                    {/* Control buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Play/Pause */}
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              if (videoRef.current.paused) {
                                // Ensure we're at clip start if before
                                if (videoRef.current.currentTime < selectedItem.timestamp) {
                                  videoRef.current.currentTime = selectedItem.timestamp;
                                }
                                videoRef.current.play();
                              } else {
                                videoRef.current.pause();
                              }
                            }
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full"
                        >
                          {videoRef.current?.paused !== false ? (
                            <Play className="w-5 h-5 text-white ml-0.5" />
                          ) : (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          )}
                        </button>

                        {/* Restart clip */}
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = selectedItem.timestamp;
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full"
                          title="Restart clip"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                      </div>

                      {/* Clip timestamp */}
                      <div className="text-white text-sm font-mono">
                        {formatTimestamp(currentTime - selectedItem.timestamp)} / {formatTimestamp(selectedItem.duration)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <Play className="w-12 h-12 mb-2" />
                  <span>Video preview unavailable</span>
                </div>
              )}
            </div>

            {/* Correction Form - Shows based on current queue */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              {/* SEGMENTATION QUEUE: Show boundary marking tools */}
              {phaseFilter === 'segment' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                      Step 1: Is this ONE play with correct boundaries?
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                      Watch the video. If this segment contains multiple plays or the boundaries are wrong, mark the correct boundaries below.
                    </p>

                    {/* Quick Answer Buttons */}
                    <div className="flex gap-3 mb-4">
                      <button
                        onClick={() => approveBoundaries(selectedItem.id)}
                        className="flex-1 py-3 rounded-lg font-medium transition-colors bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-600 hover:text-white"
                      >
                        ✓ Yes, boundaries are correct
                      </button>
                      <button
                        onClick={() => {
                          updateCorrection(selectedItem.id, 'segmentationCorrect', false);
                        }}
                        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                          corrections[selectedItem.id]?.segmentationCorrect === false
                            ? 'bg-red-600 text-white'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                        }`}
                      >
                        ✗ No, needs correction
                      </button>
                    </div>
                  </div>

                  {/* Visual Timeline Marker - Only show when user needs to correct boundaries */}
                  {corrections[selectedItem.id]?.segmentationCorrect === false && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                          Mark Play Boundaries - Click Timeline
                        </label>
                        <div className="bg-orange-800 dark:bg-orange-700 text-white px-3 py-1 rounded-lg font-mono text-lg font-bold">
                          {formatTimestamp(currentTime)}
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="mb-3 space-y-1">
                        <p className="text-sm text-orange-700 dark:text-orange-400">
                          <strong>Keyboard:</strong> Press <kbd className="px-1.5 py-0.5 bg-orange-200 dark:bg-orange-800 rounded text-xs font-mono">S</kbd> for Start, <kbd className="px-1.5 py-0.5 bg-orange-200 dark:bg-orange-800 rounded text-xs font-mono">E</kbd> for End, <kbd className="px-1.5 py-0.5 bg-orange-200 dark:bg-orange-800 rounded text-xs font-mono">Space</kbd> for Split
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-500">
                          Or click timeline: 1st = Start (green) | 2nd = End (red) | More = Split (orange)
                        </p>
                      </div>

                      {/* Visual Timeline */}
                      <div className="mb-4">
                        <div
                          className="relative h-12 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-crosshair overflow-hidden"
                          onClick={(e) => {
                            if (!videoDuration) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const clickTime = (clickX / rect.width) * videoDuration;
                            const roundedTime = Math.round(clickTime * 2) / 2;

                            const hasStart = corrections[selectedItem.id]?.actualStartTime != null;
                            const hasEnd = corrections[selectedItem.id]?.actualEndTime != null;

                            if (!hasStart) {
                              updateCorrection(selectedItem.id, 'actualStartTime', roundedTime);
                            } else if (!hasEnd) {
                              updateCorrection(selectedItem.id, 'actualEndTime', roundedTime);
                            } else {
                              const currentSplits = corrections[selectedItem.id]?.splitPoints || '';
                              const splitArray = currentSplits ? currentSplits.split(',').map((s: string) => s.trim()) : [];
                              splitArray.push(String(roundedTime));
                              splitArray.sort((a: string, b: string) => parseFloat(a) - parseFloat(b));
                              updateCorrection(selectedItem.id, 'splitPoints', splitArray.join(', '));
                              updateCorrection(selectedItem.id, 'hasMultiplePlays', true);
                            }
                          }}
                        >
                          {/* Current playhead */}
                          {videoDuration > 0 && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-20"
                              style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                            />
                          )}

                          {/* AI detected range (gray) */}
                          {videoDuration > 0 && (
                            <div
                              className="absolute top-1 bottom-1 bg-gray-400/50 dark:bg-gray-500/50 rounded"
                              style={{
                                left: `${(selectedItem.timestamp / videoDuration) * 100}%`,
                                width: `${(selectedItem.duration / videoDuration) * 100}%`
                              }}
                            />
                          )}

                          {/* Corrected START marker (green) */}
                          {videoDuration > 0 && corrections[selectedItem.id]?.actualStartTime != null && (
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-green-500 cursor-pointer z-10 group"
                              style={{ left: `${(corrections[selectedItem.id].actualStartTime / videoDuration) * 100}%` }}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCorrection(selectedItem.id, 'actualStartTime', null);
                              }}
                              title="Click to remove start marker"
                            >
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow" />
                              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-green-600 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100">
                                Start: {formatTimestamp(corrections[selectedItem.id].actualStartTime)}
                              </div>
                            </div>
                          )}

                          {/* Corrected END marker (red) */}
                          {videoDuration > 0 && corrections[selectedItem.id]?.actualEndTime != null && (
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-pointer z-10 group"
                              style={{ left: `${(corrections[selectedItem.id].actualEndTime / videoDuration) * 100}%` }}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCorrection(selectedItem.id, 'actualEndTime', null);
                              }}
                              title="Click to remove end marker"
                            >
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow" />
                              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-red-600 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100">
                                End: {formatTimestamp(corrections[selectedItem.id].actualEndTime)}
                              </div>
                            </div>
                          )}

                          {/* Split point markers (orange) */}
                          {videoDuration > 0 && corrections[selectedItem.id]?.splitPoints &&
                            corrections[selectedItem.id].splitPoints.split(',').map((time: string, idx: number) => {
                              const t = parseFloat(time.trim());
                              if (isNaN(t)) return null;
                              return (
                                <div
                                  key={idx}
                                  className="absolute top-0 bottom-0 w-1 bg-orange-500 cursor-pointer z-10 group"
                                  style={{ left: `${(t / videoDuration) * 100}%` }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const splits = corrections[selectedItem.id].splitPoints.split(',')
                                      .map((s: string) => s.trim())
                                      .filter((s: string) => parseFloat(s) !== t);
                                    updateCorrection(selectedItem.id, 'splitPoints', splits.join(', '));
                                    if (splits.length === 0) {
                                      updateCorrection(selectedItem.id, 'hasMultiplePlays', false);
                                    }
                                  }}
                                  title="Click to remove split marker"
                                >
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow" />
                                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-orange-600 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100">
                                    Split: {formatTimestamp(t)}
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-gray-400 rounded-full" />
                            <span className="text-gray-500">AI detected</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            <span className="text-gray-500">Start</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                            <span className="text-gray-500">End</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-orange-500 rounded-full" />
                            <span className="text-gray-500">Split</span>
                          </div>
                          <span className="text-gray-400 ml-auto">Click markers to remove</span>
                        </div>
                      </div>

                      {/* Summary of markers */}
                      <div className="flex items-center justify-between text-sm border-t border-orange-200 dark:border-orange-800 pt-3">
                        <div className="text-gray-600 dark:text-gray-400">
                          AI: {formatTimestamp(selectedItem.timestamp)} - {formatTimestamp(selectedItem.timestamp + selectedItem.duration)}
                        </div>
                        <div className="flex items-center gap-4">
                          {corrections[selectedItem.id]?.actualStartTime != null && (
                            <span className="text-green-600 dark:text-green-400">
                              Start: {formatTimestamp(corrections[selectedItem.id].actualStartTime)}
                            </span>
                          )}
                          {corrections[selectedItem.id]?.actualEndTime != null && (
                            <span className="text-red-600 dark:text-red-400">
                              End: {formatTimestamp(corrections[selectedItem.id].actualEndTime)}
                            </span>
                          )}
                          {corrections[selectedItem.id]?.splitPoints && (
                            <span className="text-orange-600 dark:text-orange-400">
                              {corrections[selectedItem.id].splitPoints.split(',').filter((s: string) => s.trim()).length} splits
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Submit Boundary Corrections Button */}
                      <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
                        <button
                          onClick={() => submitBoundaryCorrection(selectedItem.id)}
                          disabled={!corrections[selectedItem.id]?.splitPoints && !corrections[selectedItem.id]?.actualStartTime && !corrections[selectedItem.id]?.actualEndTime}
                          className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Submit Boundary Corrections
                          {corrections[selectedItem.id]?.splitPoints && (
                            <span className="bg-orange-500 px-2 py-0.5 rounded text-sm">
                              Will create {corrections[selectedItem.id].splitPoints.split(',').filter((s: string) => s.trim()).length + 1} plays
                            </span>
                          )}
                        </button>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 text-center">
                          {corrections[selectedItem.id]?.splitPoints
                            ? `Splitting segment ${formatTimestamp(selectedItem.timestamp)} - ${formatTimestamp(selectedItem.timestamp + selectedItem.duration)} into ${corrections[selectedItem.id].splitPoints.split(',').filter((s: string) => s.trim()).length + 1} plays`
                            : 'Mark splits with Spacebar, or S/E to adjust start/end'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ANALYSIS QUEUE: Show play analysis form */}
              {phaseFilter === 'analyze' && (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                          Step 2: What's happening in this play?
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          Now tell us about the play. This teaches the AI to understand basketball.
                        </p>
                      </div>
                      <button
                        onClick={() => sendBackToSegmentation(selectedItem.id)}
                        className="px-3 py-1.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 flex items-center gap-1"
                        title="Send back if this contains multiple plays"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Multiple plays?
                      </button>
                    </div>
                  </div>

                  {/* Play Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Play Type
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">AI detected:</span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-900 dark:text-white">
                        {selectedItem.playType || 'Unknown'}
                      </span>
                    </div>
                    <select
                      value={corrections[selectedItem.id]?.playType || ''}
                      onChange={(e) =>
                        updateCorrection(selectedItem.id, 'playType', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
                    >
                      <option value="">Select correct play type...</option>
                      <optgroup label="Basketball">
                        {PLAY_TYPES.basketball.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Football">
                        {PLAY_TYPES.football.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Formation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Formation / Set
                    </label>
                    <select
                      value={corrections[selectedItem.id]?.formation || ''}
                      onChange={(e) =>
                        updateCorrection(selectedItem.id, 'formation', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
                    >
                      <option value="">Select formation...</option>
                      <optgroup label="Basketball">
                        {FORMATIONS.basketball.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Football">
                        {FORMATIONS.football.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Key Events */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Key Events in This Play
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'shotAttempt', label: 'Shot Attempt' },
                        { key: 'shotMade', label: 'Shot Made' },
                        { key: 'turnover', label: 'Turnover' },
                        { key: 'foul', label: 'Foul' },
                        { key: 'assist', label: 'Assist' },
                        { key: 'steal', label: 'Steal' },
                        { key: 'block', label: 'Block' },
                        { key: 'rebound', label: 'Rebound' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={corrections[selectedItem.id]?.events?.[key] || false}
                            onChange={(e) => {
                              const currentEvents = corrections[selectedItem.id]?.events || {};
                              updateCorrection(selectedItem.id, 'events', {
                                ...currentEvents,
                                [key]: e.target.checked,
                              });
                            }}
                            className="w-4 h-4 text-[#0f2d52] rounded border-gray-300 focus:ring-[#0f2d52]"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Label Players with Label Studio */}
                  <div className={`rounded-lg p-4 border ${
                    selectedItem.hasPlayerAnnotations
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className={`font-semibold flex items-center gap-2 ${
                          selectedItem.hasPlayerAnnotations
                            ? 'text-green-800 dark:text-green-300'
                            : 'text-purple-800 dark:text-purple-300'
                        }`}>
                          {selectedItem.hasPlayerAnnotations ? (
                            <>
                              <Check className="w-4 h-4" />
                              Players Labeled ({selectedItem.playerAnnotationCount})
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4" />
                              Label Players
                            </>
                          )}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          selectedItem.hasPlayerAnnotations
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-purple-700 dark:text-purple-400'
                        }`}>
                          {selectedItem.hasPlayerAnnotations
                            ? 'Bounding boxes saved. Click to edit if needed.'
                            : 'Draw bounding boxes around players and label jersey numbers'}
                        </p>
                      </div>
                      {labelStudioStatus?.connected && (
                        <a
                          href={labelStudioStatus.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs hover:underline flex items-center gap-1 ${
                            selectedItem.hasPlayerAnnotations
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          Open Label Studio <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {!labelStudioStatus?.connected ? (
                      <div className="text-sm text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded p-3">
                        <p className="font-medium">Label Studio not connected</p>
                        <p className="text-xs mt-1">
                          {labelStudioStatus?.error || 'Set LABEL_STUDIO_URL and LABEL_STUDIO_API_KEY in your environment'}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => sendToLabelStudio(selectedItem.id)}
                        disabled={sendingToLabelStudio}
                        className={`w-full py-2.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${
                          selectedItem.hasPlayerAnnotations
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {sendingToLabelStudio ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : selectedItem.hasPlayerAnnotations ? (
                          <>
                            <Users className="w-4 h-4" />
                            Edit in Label Studio
                            <ExternalLink className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4" />
                            Open in Label Studio
                            <ExternalLink className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Play Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      What's Happening? (helps model learn)
                    </label>
                    <textarea
                      value={corrections[selectedItem.id]?.description || ''}
                      onChange={(e) =>
                        updateCorrection(selectedItem.id, 'description', e.target.value)
                      }
                      placeholder="Describe the play in detail... e.g., 'Point guard drives left, kicks to wing, swing pass to corner for open 3'"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52] resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Submit Analysis Button */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => submitCorrection(selectedItem.id)}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Submit Play Analysis
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      This trains the AI to recognize play types and patterns
                    </p>
                  </div>
                </div>
              )}

              {/* Optional: Notes (shown in both phases) */}
              <details className="mt-4 pt-2">
                <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  + Add notes or player corrections
                </summary>
                <div className="mt-3 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={corrections[selectedItem.id]?.notes || ''}
                      onChange={(e) =>
                        updateCorrection(selectedItem.id, 'notes', e.target.value)
                      }
                      placeholder="Any other context or issues..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52] resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Player Corrections */}
                  {selectedItem.players.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Player Corrections
                      </label>
                      <div className="space-y-2">
                        {selectedItem.players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="w-10 h-10 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold">
                              {player.jerseyNumber}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{player.team}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Detected: {player.detectedPosition || 'Unknown'}
                              </div>
                            </div>
                            <select
                              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-[#0f2d52]"
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
                </div>
              </details>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
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
