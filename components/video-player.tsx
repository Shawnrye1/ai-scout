'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface TimelineMarker {
  id: string;
  time: number; // in seconds
  label: string;
  type: 'play' | 'moment' | 'highlight';
  color?: string;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  markers?: TimelineMarker[];
  initialTime?: number;
  onClose?: () => void;
  onTimeUpdate?: (time: number) => void;
  onMarkerClick?: (marker: TimelineMarker) => void;
}

export function VideoPlayer({
  src,
  poster,
  title,
  markers = [],
  initialTime = 0,
  onClose,
  onTimeUpdate,
  onMarkerClick,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [hoveredMarker, setHoveredMarker] = useState<TimelineMarker | null>(null);
  const [buffered, setBuffered] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (initialTime > 0) {
        video.currentTime = initialTime;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      const videoEl = e.target as HTMLVideoElement;
      const errorCode = videoEl.error?.code;
      const errorMessage = videoEl.error?.message || 'Unknown error';
      console.error('Video error:', errorCode, errorMessage);
      setError(`Video error: ${errorMessage} (code: ${errorCode})`);
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      setError(null);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [initialTime, onTimeUpdate]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [isFullscreen]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;

    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
  }, [duration, seekTo]);

  const skipBackward = useCallback(() => {
    seekTo(currentTime - 10);
  }, [currentTime, seekTo]);

  const skipForward = useCallback(() => {
    seekTo(currentTime + 10);
  }, [currentTime, seekTo]);

  const goToPreviousMarker = useCallback(() => {
    const previousMarkers = markers.filter(m => m.time < currentTime - 1);
    if (previousMarkers.length > 0) {
      const marker = previousMarkers[previousMarkers.length - 1];
      seekTo(marker.time);
      onMarkerClick?.(marker);
    }
  }, [markers, currentTime, seekTo, onMarkerClick]);

  const goToNextMarker = useCallback(() => {
    const nextMarker = markers.find(m => m.time > currentTime + 1);
    if (nextMarker) {
      seekTo(nextMarker.time);
      onMarkerClick?.(nextMarker);
    }
  }, [markers, currentTime, seekTo, onMarkerClick]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    return () => { if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          skipBackward();
          break;
        case 'ArrowRight':
          skipForward();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Escape':
          if (!isFullscreen) {
            onClose?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipBackward, skipForward, toggleMute, toggleFullscreen, isFullscreen, onClose]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-black ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-xl overflow-hidden'}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
      />

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium truncate">{title}</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white p-6 max-w-md">
              <div className="text-red-400 mb-2">⚠️ Video Error</div>
              <p className="text-sm text-gray-300 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  videoRef.current?.load();
                }}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Play/Pause Center Button */}
        {!isPlaying && !error && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-20 h-20 rounded-full bg-[#0f2d52]/90 flex items-center justify-center hover:bg-[#0f2d52] transition-colors">
              <Play className="w-10 h-10 text-white ml-1" />
            </div>
          </button>
        )}

        {/* Bottom Controls */}
        <div className="bg-gradient-to-t from-black/70 to-transparent p-4 pt-16">
          {/* Progress Bar */}
          <div className="mb-4">
            <div
              ref={progressRef}
              className="relative h-1 bg-white/30 rounded-full cursor-pointer group"
              onClick={handleProgressClick}
            >
              {/* Buffered */}
              <div
                className="absolute h-full bg-white/40 rounded-full"
                style={{ width: `${(buffered / duration) * 100}%` }}
              />

              {/* Progress */}
              <div
                className="absolute h-full bg-[#0f2d52] rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />

              {/* Markers */}
              {markers.map((marker) => (
                <button
                  key={marker.id}
                  className="absolute w-3 h-3 -top-1 transform -translate-x-1/2 rounded-full border-2 border-white transition-transform hover:scale-125 z-10"
                  style={{
                    left: `${(marker.time / duration) * 100}%`,
                    backgroundColor: marker.color || (marker.type === 'highlight' ? '#22c55e' : '#f59e0b'),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(marker.time);
                    onMarkerClick?.(marker);
                  }}
                  onMouseEnter={() => setHoveredMarker(marker)}
                  onMouseLeave={() => setHoveredMarker(null)}
                />
              ))}

              {/* Playhead */}
              <div
                className="absolute w-4 h-4 bg-white rounded-full -top-1.5 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />

              {/* Marker Tooltip */}
              {hoveredMarker && (
                <div
                  className="absolute bottom-6 transform -translate-x-1/2 bg-black/90 text-white text-sm px-2 py-1 rounded whitespace-nowrap"
                  style={{ left: `${(hoveredMarker.time / duration) * 100}%` }}
                >
                  {hoveredMarker.label}
                </div>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>

              {/* Skip Back */}
              <button
                onClick={skipBackward}
                className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Skip Forward */}
              <button
                onClick={skipForward}
                className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Previous/Next Marker */}
              {markers.length > 0 && (
                <>
                  <button
                    onClick={goToPreviousMarker}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
                    title="Previous play"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextMarker}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
                    title="Next play"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Volume */}
              <button
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* Time */}
              <span className="text-white text-sm ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal wrapper for the video player
interface VideoPlayerModalProps extends VideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VideoPlayerModal({ isOpen, onClose, ...props }: VideoPlayerModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh]">
        <VideoPlayer {...props} onClose={onClose} />
      </div>
    </div>
  );
}
