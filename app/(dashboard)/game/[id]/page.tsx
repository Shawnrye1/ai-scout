'use client';

import { use } from 'react';
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
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  uploading: { label: 'Uploading', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  queued: { label: 'Queued for Processing', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  detecting: { label: 'Detecting Players', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  tracking: { label: 'Tracking Movement', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  analyzing: { label: 'Generating Reports', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ready: { label: 'Analysis Complete', color: 'text-green-600', bgColor: 'bg-green-50' },
  failed: { label: 'Processing Failed', color: 'text-red-600', bgColor: 'bg-red-50' },
};

function PlayerCard({ player }: { player: any }) {
  const analysis = player.analysis;
  const grade = analysis?.overallGrade ? parseFloat(analysis.overallGrade) : null;

  return (
    <Link href={`#player-${player.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
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
            <div className="text-right">
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
      </div>
    </Link>
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
  const { data, error, isLoading } = useSWR(`/api/games/${id}`, fetcher, {
    refreshInterval: 5000, // Poll while processing
  });

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
          <Button variant="outline" className="gap-2">
            <Play className="w-4 h-4" />
            Watch Video
          </Button>
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

          {/* Right Column - Players */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Player Reports</h2>
              <span className="text-sm text-gray-500">{allPlayers.length} players</span>
            </div>

            {allPlayers.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No players detected yet</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {allPlayers.map((player: any) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
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
