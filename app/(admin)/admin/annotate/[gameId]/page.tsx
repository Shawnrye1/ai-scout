'use client';

import { use, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  Scissors,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Volume2,
  VolumeX,
  Edit3,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Play {
  id: string;
  playNumber: number | null;
  startTimestamp: number;
  endTimestamp: number;
  playType: string | null;
  formation: string | null;
  confidence: number;
  needsReview: boolean | null;
  possessionTeamId: string | null;
  shotAttempted: boolean | null;
  shotMade: boolean | null;
  turnover: boolean | null;
}

interface Gap {
  startTime: number;
  endTime: number;
  duration: number;
}

interface Team {
  id: string;
  teamLabel: string | null;
  teamName: string | null;
  primaryJerseyColor: string | null;
  isUserTeam: boolean | null;
}

interface DetectedPlayer {
  id: string;
  jerseyNumber: string | null;
  displayName: string | null;
  positionGuess: string | null;
  detectedTeamId: string | null;
  thumbnailUrl: string | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AnnotateGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Timeline state
  const [zoom, setZoom] = useState(1); // 1 = fit all, higher = zoomed in
  const [scrollOffset, setScrollOffset] = useState(0);

  // Editing state
  const [selectedPlay, setSelectedPlay] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Play>>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Split mode
  const [splitMode, setSplitMode] = useState(false);

  // Player panel state
  const [playerPanelOpen, setPlayerPanelOpen] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Fetch game data
  const { data, error, isLoading } = useSWR(`/api/admin/annotate/${gameId}`, fetcher);

  // Local plays state for editing
  const [localPlays, setLocalPlays] = useState<Play[]>([]);

  useEffect(() => {
    if (data?.plays) {
      setLocalPlays(data.plays);
    }
  }, [data?.plays]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [data?.game?.videoUrl]);

  // Update playback speed when changed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Calculate visible time range based on zoom
  const visibleDuration = useMemo(() => {
    if (!duration) return 0;
    return duration / zoom;
  }, [duration, zoom]);

  // Calculate pixels per second
  const pixelsPerSecond = useMemo(() => {
    const timelineWidth = timelineRef.current?.clientWidth || 800;
    return timelineWidth / visibleDuration;
  }, [visibleDuration]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Seek to time
  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  // Skip forward/backward
  const skipForward = useCallback(() => seekTo(currentTime + 5), [currentTime, seekTo]);
  const skipBackward = useCallback(() => seekTo(currentTime - 5), [currentTime, seekTo]);

  // Frame step (1/30th second)
  const stepForward = useCallback(() => seekTo(currentTime + 1/30), [currentTime, seekTo]);
  const stepBackward = useCallback(() => seekTo(currentTime - 1/30), [currentTime, seekTo]);

  // Navigate between plays
  const goToPreviousPlay = useCallback(() => {
    const previous = [...localPlays]
      .filter(p => p.startTimestamp < currentTime - 0.5)
      .sort((a, b) => b.startTimestamp - a.startTimestamp)[0];
    if (previous) {
      seekTo(previous.startTimestamp);
      setSelectedPlay(previous.id);
    }
  }, [localPlays, currentTime, seekTo]);

  const goToNextPlay = useCallback(() => {
    const next = localPlays.find(p => p.startTimestamp > currentTime + 0.5);
    if (next) {
      seekTo(next.startTimestamp);
      setSelectedPlay(next.id);
    }
  }, [localPlays, currentTime, seekTo]);

  // Navigate to gap
  const goToGap = useCallback((gap: Gap) => {
    seekTo(gap.startTime);
  }, [seekTo]);

  // Handle timeline click
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const clickTime = (x / rect.width) * visibleDuration + scrollOffset;

    if (splitMode && selectedPlay) {
      // Split the selected play at this point
      const play = localPlays.find(p => p.id === selectedPlay);
      if (play && clickTime > play.startTimestamp && clickTime < play.endTimestamp) {
        splitPlayAt(selectedPlay, clickTime);
        setSplitMode(false);
      }
    } else {
      seekTo(clickTime);

      // Check if clicked on a play
      const clickedPlay = localPlays.find(
        p => clickTime >= p.startTimestamp && clickTime <= p.endTimestamp
      );
      setSelectedPlay(clickedPlay?.id || null);
    }
  }, [isDragging, visibleDuration, scrollOffset, splitMode, selectedPlay, localPlays, seekTo]);

  // Split a play at a specific time
  const splitPlayAt = useCallback((playId: string, splitTime: number) => {
    const playIndex = localPlays.findIndex(p => p.id === playId);
    if (playIndex === -1) return;

    const play = localPlays[playIndex];
    if (splitTime <= play.startTimestamp || splitTime >= play.endTimestamp) return;

    // Create two new plays from the split
    const newPlay1: Play = {
      ...play,
      endTimestamp: splitTime,
    };

    const newPlay2: Play = {
      ...play,
      id: `new-${Date.now()}`,
      playNumber: (play.playNumber || 0) + 1,
      startTimestamp: splitTime,
    };

    // Update local plays
    const newPlays = [...localPlays];
    newPlays.splice(playIndex, 1, newPlay1, newPlay2);

    // Renumber plays
    newPlays.sort((a, b) => a.startTimestamp - b.startTimestamp);
    newPlays.forEach((p, i) => {
      p.playNumber = i + 1;
    });

    setLocalPlays(newPlays);
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(newPlay1.id, newPlay1);
      next.set(newPlay2.id, newPlay2);
      return next;
    });
  }, [localPlays]);

  // Track if we're currently recording a play
  const [recordingPlayId, setRecordingPlayId] = useState<string | null>(null);

  // Add a new play at current time (or end the current recording)
  const addPlayAtCurrentTime = useCallback(() => {
    if (recordingPlayId) {
      // End the current recording - set end timestamp to current time
      const updatedPlays = localPlays.map(p => {
        if (p.id === recordingPlayId) {
          const updatedPlay = { ...p, endTimestamp: currentTime };
          // Update pending changes
          setPendingChanges(prev => {
            const next = new Map(prev);
            next.set(p.id, updatedPlay);
            return next;
          });
          return updatedPlay;
        }
        return p;
      });

      setLocalPlays(updatedPlays);
      setRecordingPlayId(null);

      // Immediately start a new play
      const newPlay: Play = {
        id: `new-${Date.now()}`,
        playNumber: localPlays.length + 1,
        startTimestamp: currentTime,
        endTimestamp: duration, // Will extend to end until next click
        playType: null,
        formation: null,
        confidence: 1,
        needsReview: true,
        possessionTeamId: null,
        shotAttempted: null,
        shotMade: null,
        turnover: null,
      };

      const newPlays = [...updatedPlays, newPlay].sort((a, b) => a.startTimestamp - b.startTimestamp);
      newPlays.forEach((p, i) => {
        p.playNumber = i + 1;
      });

      setLocalPlays(newPlays);
      setSelectedPlay(newPlay.id);
      setRecordingPlayId(newPlay.id);
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.set(newPlay.id, newPlay);
        return next;
      });
    } else {
      // Start a new recording
      const newPlay: Play = {
        id: `new-${Date.now()}`,
        playNumber: localPlays.length + 1,
        startTimestamp: currentTime,
        endTimestamp: duration, // Will extend to end until next click
        playType: null,
        formation: null,
        confidence: 1,
        needsReview: true,
        possessionTeamId: null,
        shotAttempted: null,
        shotMade: null,
        turnover: null,
      };

      const newPlays = [...localPlays, newPlay].sort((a, b) => a.startTimestamp - b.startTimestamp);
      newPlays.forEach((p, i) => {
        p.playNumber = i + 1;
      });

      setLocalPlays(newPlays);
      setSelectedPlay(newPlay.id);
      setRecordingPlayId(newPlay.id);
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.set(newPlay.id, newPlay);
        return next;
      });
    }
  }, [localPlays, currentTime, duration, recordingPlayId]);

  // Delete selected play
  const deleteSelectedPlay = useCallback(() => {
    if (!selectedPlay) return;

    const newPlays = localPlays.filter(p => p.id !== selectedPlay);
    newPlays.forEach((p, i) => {
      p.playNumber = i + 1;
    });

    setLocalPlays(newPlays);
    setSelectedPlay(null);
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(selectedPlay, { id: selectedPlay } as any); // Mark for deletion
      return next;
    });
  }, [selectedPlay, localPlays]);

  // Update play boundary
  const updatePlayBoundary = useCallback((playId: string, field: 'startTimestamp' | 'endTimestamp', value: number) => {
    setLocalPlays(prev => prev.map(p =>
      p.id === playId ? { ...p, [field]: value } : p
    ));
    setPendingChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(playId) || {};
      next.set(playId, { ...existing, id: playId, [field]: value });
      return next;
    });
  }, []);

  // Update play type
  const updatePlayType = useCallback((playId: string, playType: string) => {
    setLocalPlays(prev => prev.map(p =>
      p.id === playId ? { ...p, playType, needsReview: false } : p
    ));
    setPendingChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(playId) || {};
      next.set(playId, { ...existing, id: playId, playType, needsReview: false });
      return next;
    });
  }, []);

  // Fill a gap with a new play
  const fillGap = useCallback((gap: Gap) => {
    const newPlay: Play = {
      id: `new-${Date.now()}`,
      playNumber: localPlays.length + 1,
      startTimestamp: gap.startTime,
      endTimestamp: gap.endTime,
      playType: null,
      formation: null,
      confidence: 1,
      needsReview: true,
      possessionTeamId: null,
      shotAttempted: null,
      shotMade: null,
      turnover: null,
    };

    const newPlays = [...localPlays, newPlay].sort((a, b) => a.startTimestamp - b.startTimestamp);
    newPlays.forEach((p, i) => {
      p.playNumber = i + 1;
    });

    setLocalPlays(newPlays);
    setSelectedPlay(newPlay.id);
    seekTo(gap.startTime);
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(newPlay.id, newPlay);
      return next;
    });
  }, [localPlays, seekTo]);

  // Save changes
  const saveChanges = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/annotate/${gameId}/plays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: Array.from(pendingChanges.values()),
        }),
      });

      if (response.ok) {
        setPendingChanges(new Map());
        mutate(`/api/admin/annotate/${gameId}`);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [gameId, pendingChanges]);

  // Mark as reviewed - sends to Corrections queue for play-by-play review
  const markAsReviewed = useCallback(async () => {
    try {
      // First save any pending changes
      if (pendingChanges.size > 0) {
        await fetch(`/api/admin/annotate/${gameId}/plays`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: Array.from(pendingChanges.values()),
          }),
        });
      }

      // Mark annotation as complete
      await fetch(`/api/admin/annotate/${gameId}/complete`, {
        method: 'POST',
      });

      // Redirect to corrections queue for play-by-play review
      window.location.href = '/admin/corrections';
    } catch (error) {
      console.error('Failed to complete annotation:', error);
    }
  }, [gameId, pendingChanges]);

  // Handle drag for play boundaries
  useEffect(() => {
    if (!isDragging || !selectedPlay) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const time = (x / rect.width) * visibleDuration + scrollOffset;
      const clampedTime = Math.max(0, Math.min(time, duration));

      if (isDragging === 'start') {
        updatePlayBoundary(selectedPlay, 'startTimestamp', clampedTime);
      } else if (isDragging === 'end') {
        updatePlayBoundary(selectedPlay, 'endTimestamp', clampedTime);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, selectedPlay, visibleDuration, scrollOffset, duration, updatePlayBoundary]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            stepBackward();
          } else {
            skipBackward();
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            stepForward();
          } else {
            skipForward();
          }
          break;
        case '[':
          goToPreviousPlay();
          break;
        case ']':
          goToNextPlay();
          break;
        case 'a':
          addPlayAtCurrentTime();
          break;
        case 's':
          if (selectedPlay) {
            setSplitMode(true);
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedPlay) {
            deleteSelectedPlay();
          }
          break;
        case 'Escape':
          setSelectedPlay(null);
          setSplitMode(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipBackward, skipForward, stepBackward, stepForward, goToPreviousPlay, goToNextPlay, addPlayAtCurrentTime, selectedPlay, deleteSelectedPlay]);

  // Extract data safely (hooks must be before early returns)
  const game = data?.game;
  const coverage = data?.coverage;
  const teams = data?.teams || [];
  const players = data?.players || [];
  const gaps = coverage?.gaps || [];

  // Get selected play data - must be before early returns
  const selectedPlayData = useMemo(() =>
    localPlays.find(p => p.id === selectedPlay),
    [localPlays, selectedPlay]
  );

  // Sport-specific play types - must be before early returns
  const playTypes = useMemo(() => {
    const sport = game?.sport;
    if (sport === 'basketball') {
      return [
        'Pick and Roll',
        'Isolation',
        'Fast Break',
        'Post Up',
        'Spot Up',
        'Transition',
        'Offensive Rebound',
        'Cut',
        'Screen',
        'Turnover',
        'Free Throw',
        'Jump Ball',
      ];
    } else if (sport === 'football') {
      return [
        'Pass',
        'Run',
        'Sack',
        'Scramble',
        'Screen Pass',
        'Play Action',
        'Draw',
        'Pitch',
        'Sweep',
        'Punt',
        'Field Goal',
        'Kickoff',
        'Turnover',
      ];
    }
    return ['Play', 'Transition', 'Set Piece', 'Turnover'];
  }, [game?.sport]);

  // Generate mock player analysis data based on sport and position
  const getPlayerAnalysis = useCallback((player: DetectedPlayer) => {
    // Mock data - in real app this would come from playerAnalysis table
    const baseGrade = 75 + Math.floor(Math.random() * 20); // 75-95
    const sport = game?.sport;

    if (sport === 'football') {
      const position = player.positionGuess?.toUpperCase() || 'QB';

      if (position.includes('QB')) {
        return {
          overallGrade: baseGrade,
          subGrades: {
            arm: baseGrade + Math.floor(Math.random() * 10 - 5),
            decision: baseGrade + Math.floor(Math.random() * 10 - 5),
            pocket: baseGrade + Math.floor(Math.random() * 10 - 5),
            athletic: baseGrade + Math.floor(Math.random() * 10 - 5),
          },
          labels: ['Arm', 'Decision', 'Pocket', 'Athletic'],
          report: 'Composed pocket passer with excellent pre-snap reads. Shows ability to work through progressions and delivers accurate throws to all levels. Good pocket presence but can improve mobility on rollouts.',
        };
      } else if (position.includes('WR') || position.includes('TE')) {
        return {
          overallGrade: baseGrade,
          subGrades: {
            routes: baseGrade + Math.floor(Math.random() * 10 - 5),
            hands: baseGrade + Math.floor(Math.random() * 10 - 5),
            yac: baseGrade + Math.floor(Math.random() * 10 - 5),
            blocking: baseGrade + Math.floor(Math.random() * 10 - 5),
          },
          labels: ['Routes', 'Hands', 'YAC', 'Blocking'],
          report: 'Reliable target with crisp route running. Creates separation at the top of routes and has strong hands in traffic. Shows willingness to block in the run game.',
        };
      } else if (position.includes('RB')) {
        return {
          overallGrade: baseGrade,
          subGrades: {
            vision: baseGrade + Math.floor(Math.random() * 10 - 5),
            power: baseGrade + Math.floor(Math.random() * 10 - 5),
            receiving: baseGrade + Math.floor(Math.random() * 10 - 5),
            blocking: baseGrade + Math.floor(Math.random() * 10 - 5),
          },
          labels: ['Vision', 'Power', 'Receiving', 'Blocking'],
          report: 'Patient runner with good vision. Reads blocks well and hits the hole with authority. Capable receiver out of the backfield.',
        };
      } else {
        return {
          overallGrade: baseGrade,
          subGrades: {
            technique: baseGrade + Math.floor(Math.random() * 10 - 5),
            power: baseGrade + Math.floor(Math.random() * 10 - 5),
            athleticism: baseGrade + Math.floor(Math.random() * 10 - 5),
            awareness: baseGrade + Math.floor(Math.random() * 10 - 5),
          },
          labels: ['Technique', 'Power', 'Athletic', 'Awareness'],
          report: 'Solid fundamentals with good awareness. Shows ability to execute assignments consistently.',
        };
      }
    } else if (sport === 'basketball') {
      return {
        overallGrade: baseGrade,
        subGrades: {
          shooting: baseGrade + Math.floor(Math.random() * 10 - 5),
          vision: baseGrade + Math.floor(Math.random() * 10 - 5),
          defense: baseGrade + Math.floor(Math.random() * 10 - 5),
          rebounding: baseGrade + Math.floor(Math.random() * 10 - 5),
        },
        labels: ['Shooting', 'Vision', 'Defense', 'Rebounding'],
        report: 'Versatile player with balanced skillset. Makes smart decisions with the ball and contributes on both ends of the floor. Strong court awareness.',
      };
    }

    return {
      overallGrade: baseGrade,
      subGrades: {
        skill1: baseGrade,
        skill2: baseGrade,
        skill3: baseGrade,
        skill4: baseGrade,
      },
      labels: ['Skill 1', 'Skill 2', 'Skill 3', 'Skill 4'],
      report: 'Player showing solid fundamentals across all areas of the game.',
    };
  }, [game?.sport]);

  // Get selected player data
  const selectedPlayerData = useMemo(() => {
    if (!selectedPlayer) return null;
    const player = players.find((p: DetectedPlayer) => p.id === selectedPlayer);
    if (!player) return null;
    return {
      player,
      analysis: getPlayerAnalysis(player),
      playsAnalyzed: Math.floor(Math.random() * 30) + 15, // Mock: 15-45 plays
    };
  }, [selectedPlayer, players, getPlayerAnalysis]);

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          Failed to load game data
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/annotate"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-white font-semibold">
              {game.name || game.title || 'Game Annotation'}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="capitalize">{game.sport}</span>
              <span>•</span>
              <span>{formatTimeShort(game.videoDuration || 0)}</span>
              <span>•</span>
              <span>{localPlays.length} plays</span>
              <span>•</span>
              <span className={coverage?.percentage >= 95 ? 'text-green-400' : coverage?.percentage >= 85 ? 'text-yellow-400' : 'text-red-400'}>
                {coverage?.percentage || 0}% coverage
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingChanges.size > 0 && (
            <Badge variant="secondary" className="bg-yellow-600">
              {pendingChanges.size} unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlayerPanelOpen(!playerPanelOpen)}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            {playerPanelOpen ? 'Hide' : 'Show'} Players
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={saveChanges}
            disabled={pendingChanges.size === 0 || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          <Button
            size="sm"
            onClick={markAsReviewed}
            disabled={(coverage?.percentage || 0) < 95}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            Send to Review
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video and timeline section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video section */}
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            <video
              ref={videoRef}
              src={game.videoUrl}
              className="max-h-full max-w-full rounded-lg"
              onClick={togglePlay}
              muted={isMuted}
            />
          </div>

        {/* Controls bar */}
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goToPreviousPlay} title="Previous play ([)">
                <ChevronLeft className="h-5 w-5 text-gray-300" />
              </Button>
              <Button variant="ghost" size="icon" onClick={skipBackward} title="Skip back 5s">
                <SkipBack className="h-5 w-5 text-gray-300" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="h-10 w-10"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 text-white" />
                ) : (
                  <Play className="h-6 w-6 text-white" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={skipForward} title="Skip forward 5s">
                <SkipForward className="h-5 w-5 text-gray-300" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextPlay} title="Next play (])">
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </Button>

              <div className="text-white text-sm font-mono ml-4">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Edit controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={addPlayAtCurrentTime}
                className={`gap-2 ${recordingPlayId ? 'text-green-400' : 'text-gray-300 hover:text-white'}`}
                title="Mark play boundary (A)"
              >
                <Plus className="h-4 w-4" />
                Add Play
              </Button>
              {selectedPlay && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSplitMode(!splitMode)}
                    className={`gap-2 ${splitMode ? 'text-yellow-400 bg-yellow-400/20' : 'text-gray-300 hover:text-white'}`}
                    title="Split play (S)"
                  >
                    <Scissors className="h-4 w-4" />
                    Split
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deleteSelectedPlay}
                    className="gap-2 text-red-400 hover:text-red-300"
                    title="Delete play (Delete)"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>

            {/* Playback Speed & Volume */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-gray-300 hover:text-white"
                  >
                    <TrendingUp className="h-4 w-4" />
                    {playbackSpeed}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={playbackSpeed === speed ? 'bg-gray-100 dark:bg-gray-800' : ''}
                    >
                      {speed}x {speed === 1 && '(Normal)'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className="text-gray-300"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(z => Math.max(1, z / 1.5))}
                  disabled={zoom <= 1}
                  className="text-gray-300"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-gray-400 text-sm w-12 text-center">{zoom.toFixed(1)}x</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(z => Math.min(10, z * 1.5))}
                  disabled={zoom >= 10}
                  className="text-gray-300"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-gray-850 border-t border-gray-700 p-4">
          {/* Gaps indicator */}
          {gaps.length > 0 && (
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
              <span className="text-xs text-gray-500 shrink-0">Gaps:</span>
              {gaps.slice(0, 10).map((gap: Gap, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded shrink-0"
                >
                  <button
                    onClick={() => goToGap(gap)}
                    className="flex items-center gap-1 hover:text-red-300 transition-colors"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {formatTimeShort(gap.startTime)} - {formatTimeShort(gap.endTime)}
                    <span className="text-red-500">({Math.round(gap.duration)}s)</span>
                  </button>
                  <button
                    onClick={() => fillGap(gap)}
                    className="ml-1 px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    title="Fill this gap with a new play"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {gaps.length > 10 && (
                <span className="text-xs text-gray-500">+{gaps.length - 10} more</span>
              )}
            </div>
          )}

          {/* Timeline bar */}
          <div
            ref={timelineRef}
            className="relative h-16 bg-gray-800 rounded-lg cursor-crosshair overflow-hidden"
            onClick={handleTimelineClick}
          >
            {/* Time markers */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: Math.ceil(visibleDuration / 60) + 1 }, (_, i) => {
                const time = Math.floor(scrollOffset / 60) * 60 + i * 60;
                if (time > duration) return null;
                const x = ((time - scrollOffset) / visibleDuration) * 100;
                if (x < 0 || x > 100) return null;
                return (
                  <div
                    key={time}
                    className="absolute top-0 bottom-0"
                    style={{ left: `${x}%` }}
                  >
                    <div className="h-2 w-px bg-gray-600" />
                    <span className="absolute top-2 left-1 text-[10px] text-gray-500">
                      {formatTimeShort(time)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Plays */}
            {localPlays.map((play) => {
              const startX = ((play.startTimestamp - scrollOffset) / visibleDuration) * 100;
              const endX = ((play.endTimestamp - scrollOffset) / visibleDuration) * 100;
              const width = endX - startX;

              if (endX < 0 || startX > 100) return null;

              const isSelected = play.id === selectedPlay;
              const needsReview = play.needsReview || play.confidence < 0.7;

              return (
                <div
                  key={play.id}
                  className={`absolute top-6 h-8 rounded transition-all ${
                    isSelected
                      ? 'bg-blue-500 ring-2 ring-blue-300 z-10'
                      : needsReview
                      ? 'bg-yellow-600 hover:bg-yellow-500'
                      : 'bg-green-600 hover:bg-green-500'
                  }`}
                  style={{
                    left: `${Math.max(0, startX)}%`,
                    width: `${Math.min(100 - startX, width)}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlay(play.id);
                    seekTo(play.startTimestamp);
                  }}
                >
                  <div className="h-full flex items-center justify-center px-2 overflow-hidden">
                    <span className="text-white text-xs font-medium truncate">
                      {play.playNumber}
                      {play.playType && ` - ${play.playType}`}
                    </span>
                  </div>

                  {/* Drag handles when selected */}
                  {isSelected && (
                    <>
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-300 hover:bg-blue-200 rounded-l"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setIsDragging('start');
                        }}
                      />
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-300 hover:bg-blue-200 rounded-r"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setIsDragging('end');
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* Gaps highlighted */}
            {gaps.map((gap: Gap, i: number) => {
              const startX = ((gap.startTime - scrollOffset) / visibleDuration) * 100;
              const endX = ((gap.endTime - scrollOffset) / visibleDuration) * 100;
              const width = endX - startX;

              if (endX < 0 || startX > 100) return null;

              return (
                <div
                  key={`gap-${i}`}
                  className="absolute top-6 h-8 bg-red-500/30 border-2 border-red-500 border-dashed rounded"
                  style={{
                    left: `${Math.max(0, startX)}%`,
                    width: `${Math.min(100 - startX, width)}%`,
                  }}
                />
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              style={{
                left: `${((currentTime - scrollOffset) / visibleDuration) * 100}%`,
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
            </div>

            {/* Split mode indicator */}
            {splitMode && selectedPlay && (
              <div className="absolute inset-0 bg-yellow-500/10 pointer-events-none flex items-center justify-center">
                <span className="text-yellow-400 text-sm font-medium bg-gray-900/80 px-3 py-1 rounded">
                  Click on timeline to split play
                </span>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span><kbd className="px-1 bg-gray-700 rounded">Space</kbd> Play/Pause</span>
            <span><kbd className="px-1 bg-gray-700 rounded">←</kbd><kbd className="px-1 bg-gray-700 rounded">→</kbd> Skip 5s</span>
            <span><kbd className="px-1 bg-gray-700 rounded">Shift</kbd>+<kbd className="px-1 bg-gray-700 rounded">←</kbd><kbd className="px-1 bg-gray-700 rounded">→</kbd> Frame step</span>
            <span><kbd className="px-1 bg-gray-700 rounded">[</kbd><kbd className="px-1 bg-gray-700 rounded">]</kbd> Prev/Next play</span>
            <span><kbd className="px-1 bg-gray-700 rounded">A</kbd> Add play</span>
            <span><kbd className="px-1 bg-gray-700 rounded">S</kbd> Split</span>
            <span><kbd className="px-1 bg-gray-700 rounded">Del</kbd> Delete</span>
          </div>
        </div>
        </div>

        {/* Right sidebar - Play details or Player panel */}
        {playerPanelOpen ? (
          /* Player Panel */
          <div className="w-[500px] bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="aspect-[16/9] rounded-xl bg-white shadow-2xl overflow-hidden">
                <div className="h-full flex flex-col">
                  {/* Window chrome */}
                  <div className="h-10 bg-gray-100 border-b flex items-center justify-between px-3">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                    </div>
                    <div className="text-xs text-gray-500 truncate px-2">
                      {game.name || game.title || 'Game Analysis'}
                    </div>
                    <button
                      onClick={() => setPlayerPanelOpen(false)}
                      className="hover:bg-gray-200 rounded p-1"
                    >
                      <X className="h-3 w-3 text-gray-500" />
                    </button>
                  </div>

                  <div className="flex-1 flex min-h-0">
                    {/* Player sidebar */}
                    <div className="w-32 bg-gray-50 border-r p-2 overflow-y-auto">
                      <div className="text-[10px] font-semibold text-gray-400 mb-2">PLAYERS</div>
                      {players.length === 0 ? (
                        <div className="text-xs text-gray-500 text-center py-4">
                          No players detected
                        </div>
                      ) : (
                        players.map((player: DetectedPlayer) => (
                          <button
                            key={player.id}
                            onClick={() => setSelectedPlayer(player.id)}
                            className={`w-full text-xs py-1.5 px-2 rounded-lg mb-1 text-left transition-colors ${
                              selectedPlayer === player.id
                                ? 'bg-[#0f2d52] text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {player.displayName || `#${player.jerseyNumber || '?'}`}
                            {player.positionGuess && (
                              <span className="block text-[10px] opacity-70">
                                {player.positionGuess}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Player detail panel */}
                    <div className="flex-1 p-3 overflow-y-auto">
                      {selectedPlayerData ? (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-sm font-bold text-gray-900">
                                {selectedPlayerData.player.displayName || `#${selectedPlayerData.player.jerseyNumber || '?'}`}
                                {selectedPlayerData.player.positionGuess && ` - ${selectedPlayerData.player.positionGuess}`}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {selectedPlayerData.playsAnalyzed} plays analyzed
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-[#0f2d52]">
                                {selectedPlayerData.analysis.overallGrade}
                              </div>
                              <div className="text-[10px] text-gray-500">Overall</div>
                            </div>
                          </div>

                          {/* Sub-grades grid */}
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {Object.entries(selectedPlayerData.analysis.subGrades).map(([key, value], idx) => (
                              <div key={key} className="bg-gray-50 rounded-lg p-2 text-center">
                                <div className="text-base font-bold text-gray-900">{value}</div>
                                <div className="text-[10px] text-gray-500 leading-tight">
                                  {selectedPlayerData.analysis.labels[idx]}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Scout report */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-semibold text-gray-700 mb-1.5">Scout Report</div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {selectedPlayerData.analysis.report}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">
                              Select a player to view analysis
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Play Details Panel */
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
          {selectedPlayData ? (
            <>
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-white font-semibold text-lg mb-1">Play Details</h2>
                <p className="text-gray-400 text-sm">Play #{selectedPlayData.playNumber}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Play Type */}
                <div>
                  <Label className="text-gray-300 mb-2">Play Type</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between text-white border-gray-600 hover:bg-gray-700"
                      >
                        {selectedPlayData.playType || 'Select type...'}
                        <Edit3 className="h-4 w-4 ml-2 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-72">
                      <DropdownMenuLabel>Select Play Type</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {playTypes.map((type) => (
                        <DropdownMenuItem
                          key={type}
                          onClick={() => updatePlayType(selectedPlayData.id, type)}
                          className={selectedPlayData.playType === type ? 'bg-gray-100 dark:bg-gray-800' : ''}
                        >
                          {type}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Timestamps */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-300 mb-2">Start Time</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={selectedPlayData.startTimestamp.toFixed(2)}
                        onChange={(e) => updatePlayBoundary(selectedPlayData.id, 'startTimestamp', parseFloat(e.target.value))}
                        className="bg-gray-900 border-gray-600 text-white"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => seekTo(selectedPlayData.startTimestamp)}
                        className="shrink-0 border-gray-600 hover:bg-gray-700"
                      >
                        Go
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2">End Time</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={selectedPlayData.endTimestamp.toFixed(2)}
                        onChange={(e) => updatePlayBoundary(selectedPlayData.id, 'endTimestamp', parseFloat(e.target.value))}
                        className="bg-gray-900 border-gray-600 text-white"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => seekTo(selectedPlayData.endTimestamp)}
                        className="shrink-0 border-gray-600 hover:bg-gray-700"
                      >
                        Go
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-700">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white font-medium">
                        {(selectedPlayData.endTimestamp - selectedPlayData.startTimestamp).toFixed(2)}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Formation (if exists) */}
                {selectedPlayData.formation && (
                  <div>
                    <Label className="text-gray-300 mb-2">Formation</Label>
                    <div className="px-3 py-2 bg-gray-900 rounded-md text-white">
                      {selectedPlayData.formation}
                    </div>
                  </div>
                )}

                {/* Team Info */}
                {selectedPlayData.possessionTeamId && teams && (
                  <div>
                    <Label className="text-gray-300 mb-2">Possession Team</Label>
                    <div className="px-3 py-2 bg-gray-900 rounded-md text-white">
                      {teams.find((t: Team) => t.id === selectedPlayData.possessionTeamId)?.teamLabel || 'Unknown'}
                    </div>
                  </div>
                )}

                {/* Basketball-specific fields */}
                {game.sport === 'basketball' && (
                  <div className="space-y-2">
                    {selectedPlayData.shotAttempted !== null && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Shot Attempted:</span>
                        <Badge variant={selectedPlayData.shotAttempted ? 'default' : 'secondary'}>
                          {selectedPlayData.shotAttempted ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    )}
                    {selectedPlayData.shotMade !== null && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Shot Made:</span>
                        <Badge variant={selectedPlayData.shotMade ? 'default' : 'secondary'}>
                          {selectedPlayData.shotMade ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    )}
                    {selectedPlayData.turnover !== null && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Turnover:</span>
                        <Badge variant={selectedPlayData.turnover ? 'default' : 'secondary'}>
                          {selectedPlayData.turnover ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Confidence & Review Status */}
                <div className="space-y-2 pt-2 border-t border-gray-700">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Confidence:</span>
                    <Badge variant={selectedPlayData.confidence >= 0.7 ? 'default' : 'secondary'}>
                      {(selectedPlayData.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Needs Review:</span>
                    <Badge variant={selectedPlayData.needsReview ? 'secondary' : 'default'}>
                      {selectedPlayData.needsReview ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center">
              <div>
                <Clock className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Select a play from the timeline to view and edit its details
                </p>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
