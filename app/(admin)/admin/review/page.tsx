'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Check,
  X,
  Play,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Edit3,
  MessageSquare,
  Plus,
} from 'lucide-react';

interface ReviewEvent {
  id: string;
  gameId: string;
  gameName: string;
  timestamp: string;
  timestampSeconds: number;
  type: string;
  team: 'home' | 'away';
  jersey: number | null;
  confidence: number;
  reason: string;
  specialistConfidence?: number;
  // Scoring event fields
  points?: number;
  shotType?: string;
}

const REJECTION_REASONS = [
  { value: 'not_real', label: 'Not a real event', description: 'Nothing actually happened here' },
  { value: 'wrong_type', label: 'Wrong stat type', description: 'This is a different type of event' },
  { value: 'wrong_team', label: 'Wrong team', description: 'Event happened but for the other team' },
  { value: 'wrong_player', label: 'Wrong player', description: 'Event happened but different player' },
  { value: 'unclear', label: 'Too unclear to tell', description: 'Video quality or angle makes it impossible to verify' },
  { value: 'other', label: 'Other', description: 'Explain in notes' },
];

const STAT_TYPES = ['rebound', 'steal', 'block', 'turnover', 'assist', 'scoring'];

interface GameWithReview {
  id: string;
  name: string;
  videoUrl: string;
  homeScore: number;
  awayScore: number;
  officialBoxScore?: { home: number; away: number };
  scoreDiscrepancy?: { home: number; away: number };
  reviewCount: number;
  events: ReviewEvent[];
}

interface TrainingMetrics {
  totalReviewed: number;
  verified: number;
  rejected: number;
  verificationRate: number;
  byStatType: Record<string, { verified: number; rejected: number; rate: number }>;
  improvements: string[];
}

export default function ReviewQueue() {
  const [games, setGames] = useState<GameWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameWithReview | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ReviewEvent | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Rejection context state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [correctType, setCorrectType] = useState('');
  const [correctTeam, setCorrectTeam] = useState<'home' | 'away' | ''>('');
  const [correctJersey, setCorrectJersey] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Training metrics state
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics | null>(null);

  // Add missed event state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addEventTeam, setAddEventTeam] = useState<'home' | 'away'>('home');
  const [addEventPoints, setAddEventPoints] = useState<number>(2);
  const [addEventShotType, setAddEventShotType] = useState('layup');
  const [addEventTimestamp, setAddEventTimestamp] = useState('');
  const [addEventJersey, setAddEventJersey] = useState('');
  const [addEventNotes, setAddEventNotes] = useState('');

  // Clip URL state
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [clipSeekTo, setClipSeekTo] = useState<number>(0);
  const [clipEndTime, setClipEndTime] = useState<number>(0);
  const [clipError, setClipError] = useState<string | null>(null);
  const [loopCount, setLoopCount] = useState(0); // Used to force video remount on loop

  // Refs for interval access (avoids stale closure)
  const clipSeekToRef = useRef(clipSeekTo);
  const clipEndTimeRef = useRef(clipEndTime);
  const loopCountRef = useRef(loopCount);
  clipSeekToRef.current = clipSeekTo;
  clipEndTimeRef.current = clipEndTime;
  loopCountRef.current = loopCount;

  useEffect(() => {
    fetchGamesWithReview();
    fetchTrainingMetrics();
  }, []);

  // Fetch clip URL when selected event changes
  useEffect(() => {
    if (!selectedGame || !selectedEvent) {
      setClipUrl(null);
      return;
    }

    // Reset loop count when event changes
    setLoopCount(0);

    const fetchClipUrl = async () => {
      setVideoLoading(true);
      setClipError(null);
      try {
        // Build URL with optional clip boundaries from Gemini
        const event = selectedEvent as any;
        let url = `/api/admin/review/clip?gameId=${selectedGame.id}&timestamp=${selectedEvent.timestampSeconds}`;
        if (event.clipStartSeconds) {
          url += `&clipStart=${event.clipStartSeconds}`;
        }
        if (event.clipEndSeconds) {
          url += `&clipEnd=${event.clipEndSeconds}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to load video');
        }
        const data = await response.json();
        console.log('Clip info loaded:', data);
        setClipUrl(data.videoUrl);
        setClipSeekTo(data.seekTo || 0);
        setClipEndTime(data.endTime || (data.seekTo || 0) + 8);
      } catch (e) {
        console.error('Failed to fetch clip URL:', e);
        setClipError('Failed to load video clip');
        setClipUrl(null);
      } finally {
        setVideoLoading(false);
      }
    };

    fetchClipUrl();
  }, [selectedGame?.id, selectedEvent?.timestampSeconds]);

  async function fetchTrainingMetrics() {
    try {
      const res = await fetch('/api/admin/training/metrics');
      if (res.ok) {
        const data = await res.json();
        setTrainingMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch training metrics:', error);
    }
  }

  async function fetchGamesWithReview() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/review');
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
      }
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
    } finally {
      setLoading(false);
    }
  }

  async function verifyEvent(eventId: string) {
    setSubmitting(true);
    try {
      await fetch('/api/admin/review/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action: 'verify' }),
      });

      removeEventFromList(eventId);
    } catch (error) {
      console.error('Failed to verify:', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRejection(eventId: string) {
    if (!rejectionReason) {
      alert('Please select a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      await fetch('/api/admin/review/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          action: 'reject',
          context: {
            reason: rejectionReason,
            correctType: correctType || null,
            correctTeam: correctTeam || null,
            correctJersey: correctJersey ? parseInt(correctJersey) : null,
            notes: notes || null,
          },
        }),
      });

      removeEventFromList(eventId);
      resetRejectionForm();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setSubmitting(false);
    }
  }

  function removeEventFromList(eventId: string) {
    if (selectedGame) {
      const updatedEvents = selectedGame.events.filter(e => e.id !== eventId);
      if (updatedEvents.length === 0) {
        setGames(games.filter(g => g.id !== selectedGame.id));
        setSelectedGame(null);
        setSelectedEvent(null);
      } else {
        const updatedGame = { ...selectedGame, events: updatedEvents, reviewCount: updatedEvents.length };
        setGames(games.map(g => g.id === selectedGame.id ? updatedGame : g));
        setSelectedGame(updatedGame);
        setSelectedEvent(updatedEvents[0]);
      }
    }
    // Refresh training metrics after action
    fetchTrainingMetrics();
  }

  function resetRejectionForm() {
    setShowRejectDialog(false);
    setRejectionReason('');
    setCorrectType('');
    setCorrectTeam('');
    setCorrectJersey('');
    setNotes('');
  }

  function resetAddEventForm() {
    setShowAddEvent(false);
    setAddEventTeam('home');
    setAddEventPoints(2);
    setAddEventShotType('layup');
    setAddEventTimestamp('');
    setAddEventJersey('');
    setAddEventNotes('');
  }

  async function submitMissedEvent() {
    if (!selectedGame || !addEventTimestamp) {
      alert('Please enter a timestamp');
      return;
    }

    // Parse timestamp (format: "MM:SS" or "M:SS")
    const parts = addEventTimestamp.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    const timestampSeconds = minutes * 60 + seconds;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/review/add-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: selectedGame.id,
          event: {
            type: 'scoring',
            team: addEventTeam,
            points: addEventPoints,
            shotType: addEventShotType,
            timestamp: addEventTimestamp,
            timestampSeconds,
            jersey: addEventJersey ? parseInt(addEventJersey) : undefined,
            notes: addEventNotes || undefined,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update the game's score in the local state
        setGames(games.map(g => {
          if (g.id === selectedGame.id) {
            return { ...g, homeScore: data.newScore.home, awayScore: data.newScore.away };
          }
          return g;
        }));
        setSelectedGame({ ...selectedGame, homeScore: data.newScore.home, awayScore: data.newScore.away });
        resetAddEventForm();
        fetchTrainingMetrics();
      }
    } catch (error) {
      console.error('Failed to add event:', error);
    } finally {
      setSubmitting(false);
    }
  }

  // Video ref is now used for clip playback, no seeking needed

  const totalReviewItems = games.reduce((sum, g) => sum + g.reviewCount, 0);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Games List Panel */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Review Queue</h1>
            <button
              onClick={fetchGamesWithReview}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gemini-detected events needing human review
          </p>
          {totalReviewItems > 0 && (
            <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {totalReviewItems} events need review
              </span>
            </div>
          )}

          {/* Training Metrics Card */}
          {trainingMetrics && trainingMetrics.totalReviewed > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  AI Accuracy
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {trainingMetrics.verificationRate.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className={`h-full rounded-full transition-all ${
                    trainingMetrics.verificationRate >= 80
                      ? 'bg-green-500'
                      : trainingMetrics.verificationRate >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${trainingMetrics.verificationRate}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{trainingMetrics.verified} verified</span>
                <span>{trainingMetrics.rejected} rejected</span>
              </div>
              {trainingMetrics.totalReviewed < 10 && (
                <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  Review {10 - trainingMetrics.totalReviewed} more to see trends
                </p>
              )}
            </div>
          )}
        </div>

        {/* Games List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : games.length === 0 ? (
            <div className="p-8 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300">All caught up!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                No events need review
              </p>
            </div>
          ) : (
            games.map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  setSelectedGame(game);
                  setSelectedEvent(game.events[0]);
                }}
                className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedGame?.id === game.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {game.name}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    HOME {game.homeScore} - {game.awayScore} AWAY
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {game.reviewCount} to review
                  </span>
                </div>
                {game.scoreDiscrepancy && (game.scoreDiscrepancy.home !== 0 || game.scoreDiscrepancy.away !== 0) && (
                  <div className="mt-2 text-xs p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <span className="font-medium text-red-700 dark:text-red-400">Score mismatch:</span>
                    <div className="text-red-600 dark:text-red-300">
                      {game.scoreDiscrepancy.home > 0 && <div>HOME: +{game.scoreDiscrepancy.home} pts needed</div>}
                      {game.scoreDiscrepancy.away > 0 && <div>AWAY: +{game.scoreDiscrepancy.away} pts needed</div>}
                    </div>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Events List Panel */}
      {selectedGame && (
        <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                {selectedGame.name}
              </h2>
              <button
                onClick={() => setShowAddEvent(true)}
                className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                title="Add missed basket"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedGame.reviewCount} events to review
            </p>
            {selectedGame.scoreDiscrepancy && (selectedGame.scoreDiscrepancy.home > 0 || selectedGame.scoreDiscrepancy.away > 0) && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                <div className="font-medium text-red-700 dark:text-red-400 mb-1">Missing points:</div>
                {selectedGame.scoreDiscrepancy.home > 0 && (
                  <div className="text-red-600 dark:text-red-300">HOME: +{selectedGame.scoreDiscrepancy.home} pts</div>
                )}
                {selectedGame.scoreDiscrepancy.away > 0 && (
                  <div className="text-red-600 dark:text-red-300">AWAY: +{selectedGame.scoreDiscrepancy.away} pts</div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedGame.events.map((event, idx) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`w-full text-left p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  selectedEvent?.id === event.id ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {event.type === 'scoring' ? (
                      <span className="flex items-center gap-1">
                        <span className="text-lg">{event.points}pt</span>
                        <span className="text-xs text-gray-500">{event.shotType}</span>
                      </span>
                    ) : (
                      event.type
                    )}
                  </span>
                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                    event.confidence >= 6
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {event.confidence}/10
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{event.timestamp}</span>
                  <span className="capitalize">{event.team}</span>
                  {event.jersey && <span>#{event.jersey}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Review Detail Panel */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-950 overflow-y-auto">
        {selectedEvent ? (
          <div className="p-6">
            {/* Video Clip Preview */}
            <div className="bg-black rounded-lg aspect-video mb-6 flex items-center justify-center relative">
              {selectedGame && selectedEvent ? (
                <>
                  {videoLoading ? (
                    <div className="text-gray-400 flex flex-col items-center">
                      <Loader2 className="w-12 h-12 mb-2 animate-spin" />
                      <span>Loading video...</span>
                    </div>
                  ) : clipError ? (
                    <div className="text-red-400 flex flex-col items-center">
                      <AlertTriangle className="w-12 h-12 mb-2" />
                      <span>{clipError}</span>
                    </div>
                  ) : clipUrl && clipEndTime > 0 ? (
                    <>
                      <video
                        ref={videoRef}
                        key={`${selectedEvent.id}-${loopCount}`}
                        src={`${clipUrl}#t=${clipSeekTo}`}
                        className="w-full h-full rounded-lg"
                        controls
                        autoPlay
                        onTimeUpdate={(e) => {
                          const video = e.currentTarget;
                          const endTime = clipEndTimeRef.current;
                          if (endTime > 0 && video.currentTime >= endTime) {
                            video.pause();
                            // Increment loopCount to force React to remount with fresh seek
                            setLoopCount(prev => prev + 1);
                          }
                        }}
                      />
                      {/* Clip info overlay */}
                      <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm">
                        <span className="font-medium capitalize">{selectedEvent.type}</span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span>{selectedEvent.timestamp}</span>
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <Play className="w-12 h-12 mb-2" />
                  <span>Select an event to view clip</span>
                </div>
              )}
            </div>

            {/* Event Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                    {selectedEvent.type === 'scoring' ? (
                      <span className="flex items-center gap-2">
                        <span className="text-3xl">{selectedEvent.points}pt</span>
                        <span className="text-lg text-gray-500 font-normal">{selectedEvent.shotType}</span>
                      </span>
                    ) : (
                      selectedEvent.type
                    )}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {selectedEvent.timestamp} • {selectedEvent.team.toUpperCase()}
                    {selectedEvent.jersey && ` #${selectedEvent.jersey}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${
                    selectedEvent.confidence >= 6
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {selectedEvent.confidence}/10
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">confidence</div>
                </div>
              </div>

              {/* Reason */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Why needs review
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedEvent.reason}
                </p>
                {selectedEvent.specialistConfidence && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Specialist confidence: {selectedEvent.specialistConfidence}/10
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              {!showRejectDialog ? (
                <div className="flex gap-4">
                  <button
                    onClick={() => verifyEvent(selectedEvent.id)}
                    disabled={submitting}
                    className="flex-1 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    {selectedEvent.type === 'scoring'
                      ? `Yes, ${selectedEvent.team} scored ${selectedEvent.points}pts`
                      : `Yes, this is a ${selectedEvent.type}`
                    }
                  </button>
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    className="flex-1 py-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    No, this is wrong
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-red-800 dark:text-red-300">
                      Why is this wrong?
                    </h3>
                    <button
                      onClick={resetRejectionForm}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Rejection Reason */}
                  <div className="space-y-2">
                    {REJECTION_REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          rejectionReason === reason.value
                            ? 'bg-red-100 dark:bg-red-900/40 border-2 border-red-400'
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rejectionReason"
                          value={reason.value}
                          checked={rejectionReason === reason.value}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{reason.label}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{reason.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Correction fields - show based on reason */}
                  {rejectionReason === 'wrong_type' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        What type of event is this actually?
                      </label>
                      <select
                        value={correctType}
                        onChange={(e) => setCorrectType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg"
                      >
                        <option value="">Select correct type...</option>
                        {STAT_TYPES.filter(t => t !== selectedEvent.type).map((type) => (
                          <option key={type} value={type} className="capitalize">{type}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {rejectionReason === 'wrong_team' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Which team actually made the {selectedEvent.type}?
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCorrectTeam('home')}
                          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                            correctTeam === 'home'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          HOME (White)
                        </button>
                        <button
                          onClick={() => setCorrectTeam('away')}
                          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                            correctTeam === 'away'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          AWAY (Green)
                        </button>
                      </div>
                    </div>
                  )}

                  {rejectionReason === 'wrong_player' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        What's the correct jersey number?
                      </label>
                      <input
                        type="number"
                        value={correctJersey}
                        onChange={(e) => setCorrectJersey(e.target.value)}
                        placeholder="e.g., 23"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg"
                      />
                    </div>
                  )}

                  {/* Notes - always available */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Additional notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional context that would help train the AI..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Submit rejection */}
                  <button
                    onClick={() => submitRejection(selectedEvent.id)}
                    disabled={!rejectionReason || submitting}
                    className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                    Submit Rejection
                  </button>
                </div>
              )}

              {/* Quick Stats Reference */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {selectedEvent.type === 'scoring'
                    ? `What to verify for a ${selectedEvent.points}pt basket`
                    : `What counts as a ${selectedEvent.type}?`
                  }
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedEvent.type === 'rebound' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Shot must be attempted and MISSED</li>
                      <li>Player must gain clear POSSESSION of the ball</li>
                      <li>Not a rebound if ball goes out of bounds</li>
                    </ul>
                  )}
                  {selectedEvent.type === 'steal' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Defender must ACTIVELY take the ball</li>
                      <li>Defender's team must gain possession</li>
                      <li>Not a steal if ball just goes loose</li>
                    </ul>
                  )}
                  {selectedEvent.type === 'block' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Must be during a shot attempt</li>
                      <li>Defender must contact the ball</li>
                      <li>Ball must be going UP (not goaltending)</li>
                    </ul>
                  )}
                  {selectedEvent.type === 'turnover' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Offense loses possession without a shot</li>
                      <li>Could be: bad pass, violation, offensive foul</li>
                      <li>Not a turnover if a shot was attempted</li>
                    </ul>
                  )}
                  {selectedEvent.type === 'assist' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Pass leads directly to a made basket</li>
                      <li>Scorer must not dribble extensively</li>
                      <li>Clear passing connection to score</li>
                    </ul>
                  )}
                  {selectedEvent.type === 'scoring' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ball must GO THROUGH the hoop</li>
                      <li>Verify point value: 2pt (inside arc) or 3pt (beyond arc)</li>
                      <li>Verify correct team scored (jersey color)</li>
                      <li>Watch for goaltending or basket interference</li>
                      {selectedEvent.points === 1 && <li>Free throw: must be during dead ball</li>}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : selectedGame ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Select an event to review</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Play className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Select a game to start reviewing</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Missed Event Modal */}
      {showAddEvent && selectedGame && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Missed Basket
              </h3>
              <button
                onClick={resetAddEventForm}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Team */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Which team scored?
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddEventTeam('home')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                      addEventTeam === 'home'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    HOME
                    {selectedGame.scoreDiscrepancy?.home ? (
                      <span className="text-xs ml-1">(+{selectedGame.scoreDiscrepancy.home})</span>
                    ) : null}
                  </button>
                  <button
                    onClick={() => setAddEventTeam('away')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                      addEventTeam === 'away'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    AWAY
                    {selectedGame.scoreDiscrepancy?.away ? (
                      <span className="text-xs ml-1">(+{selectedGame.scoreDiscrepancy.away})</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Points
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((pts) => (
                    <button
                      key={pts}
                      onClick={() => setAddEventPoints(pts)}
                      className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
                        addEventPoints === pts
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {pts}pt
                    </button>
                  ))}
                </div>
              </div>

              {/* Shot Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shot Type
                </label>
                <select
                  value={addEventShotType}
                  onChange={(e) => setAddEventShotType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg"
                >
                  <option value="layup">Layup</option>
                  <option value="jumper">Jump Shot</option>
                  <option value="three_pointer">3-Pointer</option>
                  <option value="dunk">Dunk</option>
                  <option value="free_throw">Free Throw</option>
                  <option value="tip_in">Tip-In</option>
                </select>
              </div>

              {/* Timestamp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timestamp (MM:SS)
                </label>
                <input
                  type="text"
                  value={addEventTimestamp}
                  onChange={(e) => setAddEventTimestamp(e.target.value)}
                  placeholder="e.g., 12:34"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg"
                />
              </div>

              {/* Jersey (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jersey Number (optional)
                </label>
                <input
                  type="number"
                  value={addEventJersey}
                  onChange={(e) => setAddEventJersey(e.target.value)}
                  placeholder="e.g., 23"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg"
                />
              </div>

              {/* Submit */}
              <button
                onClick={submitMissedEvent}
                disabled={!addEventTimestamp || submitting}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Add {addEventPoints}pt {addEventTeam.toUpperCase()} Basket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
