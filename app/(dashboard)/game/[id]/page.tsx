'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  Video,
  Users,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Play,
  TrendingUp,
  Target,
  Flag,
  Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayerModal } from '@/components/video-player';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  uploading: { label: 'Uploading', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  queued: { label: 'Queued for Processing', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  detecting: { label: 'Detecting Players', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  tracking: { label: 'Tracking Movement', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  analyzing: { label: 'Generating Reports', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ready: { label: 'Analysis Complete', color: 'text-green-600', bgColor: 'bg-green-50' },
  failed: { label: 'Processing Failed', color: 'text-red-600', bgColor: 'bg-red-50' },
};

function PlayerCard({ player, gameId, onFlag, onMomentClick }: { player: any; gameId: string; onFlag?: (playerId: string) => void; onMomentClick?: (time: number) => void }) {
  const analysis = player.analysis;
  const grade = analysis?.overallGrade ? parseFloat(analysis.overallGrade) : null;
  const [flagged, setFlagged] = useState(false);

  async function handleFlag(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch('/api/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'player',
          targetId: player.id,
          reason: 'Coach flagged for review',
        }),
      });
      if (res.ok) {
        setFlagged(true);
        onFlag?.(player.id);
      }
    } catch (error) {
      console.error('Failed to flag:', error);
    }
  }

  return (
    <Link href={`/game/${gameId}/player/${player.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer relative group">
        {/* Flag Button */}
        <button
          onClick={handleFlag}
          className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors ${
            flagged
              ? 'bg-orange-100 text-orange-600'
              : 'bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-orange-100 hover:text-orange-600'
          }`}
          title={flagged ? 'Flagged for review' : 'Flag for review'}
        >
          <Flag className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {player.thumbnailUrl ? (
              <img
                src={player.thumbnailUrl}
                alt={player.displayName}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <h4 className="font-semibold text-gray-900">{player.displayName || `#${player.jerseyNumber}`}</h4>
              {player.positionGuess && (
                <p className="text-sm text-gray-500">{player.positionGuess}</p>
              )}
            </div>
          </div>
          {grade !== null && (
            <div className="text-right mr-6">
              <div className={`text-2xl font-bold ${grade >= 80 ? 'text-green-600' : grade >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {grade.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">Grade</div>
            </div>
          )}
        </div>
        {analysis?.summary && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-2">{analysis.summary}</p>
        )}

        {/* Key Moments */}
        {player.keyMoments && player.keyMoments.length > 0 && onMomentClick && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Key Moments</p>
            <div className="flex flex-wrap gap-1">
              {player.keyMoments.slice(0, 3).map((moment: any) => {
                const time = moment.timestampSeconds ? parseFloat(moment.timestampSeconds) : null;
                return (
                  <button
                    key={moment.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (time !== null) onMomentClick(time);
                    }}
                    className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                      moment.sentiment === 'positive'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : moment.sentiment === 'negative'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    {moment.momentType || 'View'}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function TeamReportCard({ team, sport }: { team: any; sport: string }) {
  const analysis = team.analysis;

  // Parse breakdowns
  const formationBreakdown = analysis?.formationBreakdown || {};
  const playTypeBreakdown = analysis?.playTypeBreakdown || {};
  const tendencies = analysis?.tendencies || {};

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        {team.primaryJerseyColor && (
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-200"
            style={{ backgroundColor: team.primaryJerseyColor }}
          />
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {team.teamName || team.teamLabel || 'Team'}
          </h3>
          {team.isUserTeam && (
            <span className="text-xs bg-[#0f2d52] text-white px-2 py-0.5 rounded-full">Your Team</span>
          )}
        </div>
      </div>

      {/* Tendencies Report */}
      {analysis?.tendenciesReport && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendencies Analysis
          </h4>
          <p className="text-gray-600 bg-gray-50 rounded-lg p-4">
            {analysis.tendenciesReport}
          </p>
        </div>
      )}

      {/* Formation Breakdown */}
      {Object.keys(formationBreakdown).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Formation Usage
          </h4>
          <div className="space-y-2">
            {Object.entries(formationBreakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([formation, percentage]) => (
                <div key={formation} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 truncate">{formation}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0f2d52] rounded-full"
                      style={{ width: `${percentage as number}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-gray-500 text-right">{percentage as number}%</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Play Type Breakdown */}
      {Object.keys(playTypeBreakdown).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Play Type Distribution
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(playTypeBreakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([playType, count]) => (
                <div key={playType} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">{count as number}</div>
                  <div className="text-sm text-gray-500 capitalize">{playType.replace(/_/g, ' ')}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Key Tendencies */}
      {Object.keys(tendencies).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Key Tendencies</h4>
          <ul className="space-y-2">
            {Object.entries(tendencies).slice(0, 5).map(([key, value]) => (
              <li key={key} className="flex items-start gap-2 text-sm">
                <span className="text-[#0f2d52] mt-0.5">•</span>
                <span className="text-gray-600">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Offensive/Defensive Metrics */}
      {(analysis?.offensiveMetrics || analysis?.defensiveMetrics) && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            {analysis?.offensiveMetrics && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Offense</h5>
                <div className="space-y-1">
                  {Object.entries(analysis.offensiveMetrics).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {analysis?.defensiveMetrics && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Defense</h5>
                <div className="space-y-1">
                  {Object.entries(analysis.defensiveMetrics).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No analysis state */}
      {!analysis && (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>Team analysis not yet available</p>
        </div>
      )}
    </div>
  );
}

function ProcessingStatus({ game }: { game: any }) {
  const status = statusConfig[game.status] || statusConfig.queued;
  const isProcessing = ['detecting', 'tracking', 'analyzing'].includes(game.status);

  return (
    <div className={`rounded-xl p-6 ${status.bgColor}`}>
      <div className="flex items-center gap-3 mb-4">
        {isProcessing ? (
          <Loader2 className={`w-6 h-6 animate-spin ${status.color}`} />
        ) : game.status === 'ready' ? (
          <CheckCircle className={`w-6 h-6 ${status.color}`} />
        ) : game.status === 'failed' ? (
          <AlertCircle className={`w-6 h-6 ${status.color}`} />
        ) : (
          <Clock className={`w-6 h-6 ${status.color}`} />
        )}
        <span className={`text-lg font-semibold ${status.color}`}>{status.label}</span>
      </div>

      {isProcessing && (
        <>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[#0f2d52] transition-all duration-500"
              style={{ width: `${game.processingProgress || 0}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{game.processingProgress || 0}% complete</p>
        </>
      )}

      {game.status === 'queued' && (
        <p className="text-sm text-gray-600">
          Your video is in the queue. Processing will begin shortly.
        </p>
      )}

      {game.status === 'failed' && game.processingError && (
        <p className="text-sm text-red-600 mt-2">{game.processingError}</p>
      )}
    </div>
  );
}

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'plays'>('players');
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const { data, error, isLoading } = useSWR(`/api/games/${id}`, fetcher, {
    refreshInterval: 5000, // Poll while processing
  });

  // Generate timeline markers from plays and key moments
  const videoMarkers = useMemo(() => {
    if (!data?.game) return [];

    const markers: { id: string; time: number; label: string; type: 'play' | 'moment' | 'highlight'; color?: string }[] = [];

    // Add plays as markers
    data.game.detectedPlays?.forEach((play: any) => {
      const startTime = play.startTimestamp ? parseFloat(play.startTimestamp) :
                        play.startTime ? play.startTime : null;
      if (startTime !== null) {
        markers.push({
          id: `play-${play.id}`,
          time: startTime,
          label: `Play ${play.playNumber || ''}${play.formation ? ` - ${play.formation}` : ''}${play.playType && play.playType !== 'unknown' ? ` (${play.playType})` : ''}`.trim(),
          type: 'play',
          color: '#f59e0b',
        });
      }
    });

    // Add key moments from players
    data.game.detectedTeams?.forEach((team: any) => {
      team.players?.forEach((player: any) => {
        player.keyMoments?.forEach((moment: any) => {
          const time = moment.timestampSeconds ? parseFloat(moment.timestampSeconds) : null;
          if (time !== null) {
            markers.push({
              id: `moment-${moment.id}`,
              time,
              label: `${player.displayName}: ${moment.description || moment.momentType}`,
              type: moment.sentiment === 'positive' ? 'highlight' : 'moment',
              color: moment.sentiment === 'positive' ? '#22c55e' : moment.sentiment === 'negative' ? '#ef4444' : '#f59e0b',
            });
          }
        });
      });
    });

    return markers.sort((a, b) => a.time - b.time);
  }, [data?.game]);

  const openVideoAt = (time: number = 0) => {
    setVideoStartTime(time);
    setIsVideoOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data?.game) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          Failed to load game. Please try again.
        </div>
      </div>
    );
  }

  const { game } = data;
  const isReady = game.status === 'ready';
  const allPlayers = game.detectedTeams?.flatMap((team: any) => team.players || []) || [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Back link */}
      <Link href="/games" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Games
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{game.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            {game.opponent && <span>vs {game.opponent}</span>}
            {game.sport && <span className="capitalize">{game.sport}</span>}
            {game.gameDate && <span>{new Date(game.gameDate).toLocaleDateString()}</span>}
          </div>
        </div>
        {game.videoUrl && (
          <Button variant="outline" className="gap-2" onClick={() => openVideoAt(0)}>
            <Play className="w-4 h-4" />
            Watch Video
          </Button>
        )}
        {/* Video Player Modal */}
        {game.videoUrl && (
          <VideoPlayerModal
            isOpen={isVideoOpen}
            onClose={() => setIsVideoOpen(false)}
            src={game.videoUrl}
            poster={game.thumbnailUrl}
            title={game.title || game.name || 'Game Film'}
            markers={videoMarkers}
            initialTime={videoStartTime}
          />
        )}
      </div>

      {/* Processing Status (if not ready) */}
      {!isReady && (
        <div className="mb-8">
          <ProcessingStatus game={game} />
        </div>
      )}

      {/* Main Content - Only show when ready */}
      {isReady && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Stats Overview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Overview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Players Detected</span>
                  <span className="font-semibold text-gray-900">{allPlayers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Plays Analyzed</span>
                  <span className="font-semibold text-gray-900">{game.detectedPlays?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Teams</span>
                  <span className="font-semibold text-gray-900">{game.detectedTeams?.length || 0}</span>
                </div>
                {game.videoDurationSeconds && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-semibold text-gray-900">
                      {Math.floor(game.videoDurationSeconds / 60)}:{(game.videoDurationSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Teams */}
            {game.detectedTeams?.map((team: any) => (
              <div key={team.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                  {team.primaryJerseyColor && (
                    <div
                      className="w-6 h-6 rounded-full border-2 border-gray-200"
                      style={{ backgroundColor: team.primaryJerseyColor }}
                    />
                  )}
                  <h3 className="font-semibold text-gray-900">
                    {team.teamName || team.teamLabel || 'Team'}
                  </h3>
                  {team.isUserTeam && (
                    <span className="text-xs bg-[#0f2d52] text-white px-2 py-0.5 rounded-full">Your Team</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {team.players?.length || 0} players detected
                </div>
                {team.analysis?.tendenciesReport && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-3">
                    {team.analysis.tendenciesReport}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Right Column - Tabbed Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200 overflow-x-auto pb-px -mb-px scrollbar-hide">
              <button
                onClick={() => setActiveTab('players')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'players'
                    ? 'border-[#0f2d52] text-[#0f2d52]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Player Reports
                </span>
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'teams'
                    ? 'border-[#0f2d52] text-[#0f2d52]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Team Reports
                </span>
              </button>
              {game.detectedPlays && game.detectedPlays.length > 0 && (
                <button
                  onClick={() => setActiveTab('plays')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'plays'
                      ? 'border-[#0f2d52] text-[#0f2d52]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Film className="w-4 h-4" />
                    Plays
                  </span>
                </button>
              )}
            </div>

            {/* Player Reports Tab */}
            {activeTab === 'players' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">{allPlayers.length} players detected</span>
                </div>

                {allPlayers.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No players detected yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {allPlayers.map((player: any) => (
                      <PlayerCard key={player.id} player={player} gameId={id} onMomentClick={openVideoAt} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Plays Tab */}
            {activeTab === 'plays' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">{game.detectedPlays?.length || 0} plays detected</span>
                  {game.videoUrl && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => openVideoAt(0)}>
                      <Play className="w-4 h-4" />
                      Watch All
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {game.detectedPlays?.map((play: any, index: number) => {
                    const startTime = play.startTimestamp ? parseFloat(play.startTimestamp) :
                                      play.startTime ? play.startTime : null;
                    const endTime = play.endTimestamp ? parseFloat(play.endTimestamp) :
                                    play.endTime ? play.endTime : null;

                    return (
                      <div
                        key={play.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => startTime !== null && openVideoAt(startTime)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-[#0f2d52] text-white flex items-center justify-center font-bold">
                              {play.playNumber || index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">
                                  {play.formation ? `${play.formation}` : `Play ${play.playNumber || index + 1}`}
                                </h4>
                                {play.playType && play.playType !== 'unknown' && (
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    play.playType === 'pass' ? 'bg-blue-100 text-blue-700' :
                                    play.playType === 'run' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {play.playType}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                {startTime !== null && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {Math.floor(startTime / 60)}:{Math.floor(startTime % 60).toString().padStart(2, '0')}
                                  </span>
                                )}
                                {play.down && play.distance && (
                                  <span>{play.down}&{play.distance}</span>
                                )}
                                {play.yardsGained !== null && play.yardsGained !== undefined && (
                                  <span className={play.yardsGained > 0 ? 'text-green-600' : 'text-red-600'}>
                                    {play.yardsGained > 0 ? '+' : ''}{play.yardsGained} yds
                                  </span>
                                )}
                                {play.playDirection && (
                                  <span className="capitalize">{play.playDirection}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {startTime !== null && game.videoUrl && (
                            <Button variant="ghost" size="sm" className="gap-1 text-[#0f2d52]">
                              <Play className="w-4 h-4" />
                              Watch
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Team Reports Tab */}
            {activeTab === 'teams' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">{game.detectedTeams?.length || 0} teams</span>
                </div>

                {!game.detectedTeams || game.detectedTeams.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No team data available yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {game.detectedTeams.map((team: any) => (
                      <TeamReportCard key={team.id} team={team} sport={game.sport || 'football'} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Waiting State */}
      {!isReady && game.status !== 'failed' && (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Your Game Film</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Our AI is analyzing your video. This typically takes 30-60 minutes depending on the length.
            We'll email you when it's ready.
          </p>
        </div>
      )}
    </div>
  );
}
