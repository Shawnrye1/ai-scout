'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Video, Loader2, CheckCircle, Link2, FileVideo, Home, Plane, FileText, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UploadState = 'idle' | 'creating' | 'uploading' | 'completing' | 'done' | 'error' | 'limit_reached';
type UploadMethod = 'file' | 'url';

interface SportsTeam {
  id: number;
  name: string;
  sport: string;
  city: string | null;
  state: string | null;
}

export default function NewGamePage() {
  const router = useRouter();
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file');
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [opponentTeamId, setOpponentTeamId] = useState<number | null>(null);
  const [isHomeGame, setIsHomeGame] = useState<boolean | null>(null);
  const [gameDate, setGameDate] = useState('');
  const [sport, setSport] = useState<'football' | 'basketball' | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [availableTeams, setAvailableTeams] = useState<SportsTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [boxScore, setBoxScore] = useState('');
  const [showBoxScore, setShowBoxScore] = useState(false);

  // Fetch available teams for opponent selection
  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch('/api/sports-teams');
        if (res.ok) {
          const data = await res.json();
          setAvailableTeams(data.teams || []);
        }
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      } finally {
        setTeamsLoading(false);
      }
    }
    fetchTeams();
  }, []);

  // Filter teams by sport if sport is selected
  const filteredTeams = sport
    ? availableTeams.filter((t) => t.sport === sport)
    : availableTeams;

  // Detect video source from URL
  const getVideoSource = (url: string): 'hudl' | 'youtube' | 'vimeo' | 'direct' | null => {
    if (!url) return null;
    if (url.includes('hudl.com')) return 'hudl';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.match(/\.(mp4|mov|avi|webm)$/i)) return 'direct';
    return null;
  };

  const videoSource = getVideoSource(videoUrl);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid video file (MP4, MOV, AVI, or WebM)');
        return;
      }
      // Validate file size (5GB max)
      if (selectedFile.size > 5 * 1024 * 1024 * 1024) {
        setError('File size must be less than 5GB');
        return;
      }
      setFile(selectedFile);
      setError('');
      // Auto-fill title if empty
      if (!title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(fileName);
      }
    }
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const input = document.getElementById('video-upload') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on upload method
    if (uploadMethod === 'file' && !file) return;
    if (uploadMethod === 'url' && !videoUrl) return;
    if (!title) return;

    setError('');

    try {
      // Step 1: Create game record
      setUploadState('creating');
      const createRes = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          opponent: opponent || undefined,
          opponentSportsTeamId: opponentTeamId || undefined,
          isHomeGame: isHomeGame ?? undefined,
          gameDate: gameDate || undefined,
          sport: sport || undefined,
          boxScore: boxScore || undefined,
          // If URL method, include the video URL directly
          ...(uploadMethod === 'url' && { videoUrl, videoSource }),
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({}));
        if (errorData.code === 'LIMIT_REACHED') {
          throw { code: 'LIMIT_REACHED', message: errorData.error };
        }
        throw new Error(errorData.error || 'Failed to create game');
      }

      const { game } = await createRes.json();

      // If URL method, skip upload steps and go straight to processing
      if (uploadMethod === 'url') {
        setUploadState('completing');

        // Complete with URL
        const completeRes = await fetch('/api/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.id,
            videoUrl,
            videoSource,
          }),
        });

        if (!completeRes.ok) {
          throw new Error('Failed to process video URL');
        }

        setUploadState('done');
        setTimeout(() => {
          router.push(`/game/${game.id}`);
        }, 1500);
        return;
      }

      // File upload flow
      // Step 2: Get presigned upload URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          filename: file!.name,
          contentType: file!.type,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, key } = await presignedRes.json();

      // Step 3: Upload file to R2
      setUploadState('uploading');

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file!.type);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      // Step 4: Mark upload complete
      setUploadState('completing');
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          key,
          fileSize: file!.size,
        }),
      });

      if (!completeRes.ok) {
        throw new Error('Failed to complete upload');
      }

      setUploadState('done');

      // Redirect to game page after a moment
      setTimeout(() => {
        router.push(`/game/${game.id}`);
      }, 1500);

    } catch (err: any) {
      // Check if it's a limit reached error
      if (err?.code === 'LIMIT_REACHED') {
        setUploadState('limit_reached');
        setError(err.message || 'Monthly game limit reached');
      } else {
        setUploadState('error');
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    }
  };

  const isUploading = ['creating', 'uploading', 'completing'].includes(uploadState);

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Back link */}
      <Link href="/games" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Games
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Game Film</h1>
        <p className="text-gray-500 mb-6">Upload your game footage and our AI will analyze every player.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload Method Toggle */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Method
            </Label>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setUploadMethod('file')}
                disabled={isUploading}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  uploadMethod === 'file'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileVideo className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod('url')}
                disabled={isUploading}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  uploadMethod === 'url'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Paste URL
              </button>
            </div>
          </div>

          {/* File Upload Area */}
          {uploadMethod === 'file' && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Video File
              </Label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-[#0f2d52]'
                }`}
              >
                <input
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <Video className="w-8 h-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-1">Drag and drop your video here, or click to browse</p>
                    <p className="text-sm text-gray-400">MP4, MOV, AVI, WebM up to 5GB</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* URL Input */}
          {uploadMethod === 'url' && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Video URL
              </Label>
              <Input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.hudl.com/video/... or YouTube/direct video link"
                disabled={isUploading}
                className="mb-2"
              />
              {videoSource && (
                <div className={`flex items-center gap-2 text-sm ${
                  videoSource === 'hudl' ? 'text-orange-600' :
                  videoSource === 'youtube' ? 'text-red-600' :
                  videoSource === 'vimeo' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  <CheckCircle className="w-4 h-4" />
                  {videoSource === 'hudl' && 'Hudl video detected'}
                  {videoSource === 'youtube' && 'YouTube video detected'}
                  {videoSource === 'vimeo' && 'Vimeo video detected'}
                  {videoSource === 'direct' && 'Direct video link detected'}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Supported: Hudl, YouTube, Vimeo, or direct video links (.mp4, .mov, etc.)
              </p>
            </div>
          )}

          {/* Game Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Game Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Week 5 vs Lincoln High"
                required
                disabled={isUploading}
              />
            </div>
            <div>
              <Label htmlFor="opponent" className="block text-sm font-medium text-gray-700 mb-1">
                Opponent Team
              </Label>
              {filteredTeams.length > 0 ? (
                <select
                  id="opponent"
                  value={opponentTeamId || ''}
                  onChange={(e) => {
                    const teamId = e.target.value ? parseInt(e.target.value) : null;
                    setOpponentTeamId(teamId);
                    const team = filteredTeams.find((t) => t.id === teamId);
                    if (team) setOpponent(team.name);
                  }}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
                >
                  <option value="">Select opponent team...</option>
                  {filteredTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} {team.city && team.state ? `(${team.city}, ${team.state})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="opponent"
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="e.g., Lincoln High"
                  disabled={isUploading}
                />
              )}
              {!teamsLoading && filteredTeams.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No teams in database. <Link href="/admin/teams" className="text-[#0f2d52] hover:underline">Add teams</Link> to enable roster matching.
                </p>
              )}
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Home / Away
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsHomeGame(true)}
                  disabled={isUploading}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    isHomeGame === true
                      ? 'border-[#0f2d52] bg-[#0f2d52]/5 text-[#0f2d52]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => setIsHomeGame(false)}
                  disabled={isUploading}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    isHomeGame === false
                      ? 'border-[#0f2d52] bg-[#0f2d52]/5 text-[#0f2d52]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Plane className="w-4 h-4" />
                  Away
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Game Date
              </Label>
              <Input
                id="date"
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Sport (or let AI detect)
              </Label>
              <div className="flex gap-3">
                {[
                  { value: '', label: 'Auto-detect' },
                  { value: 'football', label: 'Football' },
                  { value: 'basketball', label: 'Basketball' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSport(option.value as any)}
                    disabled={isUploading}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      sport === option.value
                        ? 'border-[#0f2d52] bg-[#0f2d52]/5 text-[#0f2d52]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Box Score (Optional, Collapsible) */}
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => setShowBoxScore(!showBoxScore)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">Box Score</span>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              {showBoxScore ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showBoxScore && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mt-3 mb-2">
                  Paste the box score to help AI map jersey numbers to player names and validate stats.
                </p>
                <textarea
                  value={boxScore}
                  onChange={(e) => setBoxScore(e.target.value)}
                  placeholder={`Example:
TEAM A (78)
#  Player         FG   3PT   FT  REB PF PTS AST TO BLK STL
32 Cooper Flagg*  6-16 1-5   4-6  9   2  17  4   3  3   3
30 Liam McNeeley* 7-11 3-4   2-2  2   0  19  1   0  1   2

TEAM B (72)
#  Player         FG   3PT   FT  REB PF PTS AST TO BLK STL
03 AJ Dybantsa*   7-15 2-6   2-2  4   2  18  4   6  0   1`}
                  disabled={isUploading}
                  className="w-full h-48 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52] resize-none"
                />
              </div>
            )}
          </div>

          {/* Error Message (not shown for limit_reached since we have dedicated UI) */}
          {error && uploadState !== 'limit_reached' && (
            <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="font-medium text-blue-900">
                  {uploadState === 'creating' && 'Creating game...'}
                  {uploadState === 'uploading' && `Uploading video... ${uploadProgress}%`}
                  {uploadState === 'completing' && 'Finishing up...'}
                </span>
              </div>
              {uploadState === 'uploading' && (
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {uploadState === 'done' && (
            <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">
                Upload complete! Redirecting to your game...
              </span>
            </div>
          )}

          {/* Limit Reached - Upgrade Prompt */}
          {uploadState === 'limit_reached' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                Monthly Game Limit Reached
              </h3>
              <p className="text-amber-700 mb-4">
                {error || "You've reached your plan's game limit for this month. Upgrade to upload more games."}
              </p>
              <Link href="/dashboard/billing">
                <Button className="bg-[#0f2d52] hover:bg-[#1a4a7a]">
                  View Upgrade Options
                </Button>
              </Link>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              (uploadMethod === 'file' && !file) ||
              (uploadMethod === 'url' && !videoUrl) ||
              !title ||
              isUploading ||
              uploadState === 'done' ||
              uploadState === 'limit_reached'
            }
            className="w-full bg-[#0f2d52] hover:bg-[#1a4a7a] py-3 text-base"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadMethod === 'url' ? 'Processing...' : 'Uploading...'}
              </>
            ) : (
              <>
                {uploadMethod === 'url' ? (
                  <Link2 className="w-4 h-4 mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploadMethod === 'url' ? 'Import & Analyze' : 'Upload & Analyze'}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
