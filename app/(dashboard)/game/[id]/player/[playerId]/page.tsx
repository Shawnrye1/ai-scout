'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  Users,
  Clock,
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  AlertCircle,
  Loader2,
  Flag,
  Star,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayerModal } from '@/components/video-player';

const fetcher = (url: string) => fetch(url).then(res => res.json());

function GradeCircle({ grade, size = 'lg' }: { grade: number; size?: 'sm' | 'lg' }) {
  const color = grade >= 80 ? 'text-green-600' : grade >= 60 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = grade >= 80 ? 'bg-green-100' : grade >= 60 ? 'bg-yellow-100' : 'bg-red-100';
  const sizeClasses = size === 'lg' ? 'w-16 h-16 text-2xl sm:w-24 sm:h-24 sm:text-3xl' : 'w-12 h-12 text-lg';

  return (
    <div className={`${sizeClasses} ${bgColor} rounded-full flex items-center justify-center font-bold ${color} flex-shrink-0`}>
      {grade.toFixed(0)}
    </div>
  );
}

function SubGradeBar({ label, grade }: { label: string; grade: number | null }) {
  if (grade === null) return null;

  const color = grade >= 80 ? 'bg-green-500' : grade >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-xs sm:text-sm text-gray-600 w-20 sm:w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${grade}%` }} />
      </div>
      <span className="text-xs sm:text-sm font-medium text-gray-900 w-6 sm:w-8 text-right">{grade.toFixed(0)}</span>
    </div>
  );
}

export default function PlayerDetailPage({
  params
}: {
  params: Promise<{ id: string; playerId: string }>
}) {
  const { id: gameId, playerId } = use(params);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [flagged, setFlagged] = useState(false);

  const { data, error, isLoading } = useSWR(`/api/players/${playerId}`, fetcher);

  // Generate video markers from key moments
  const videoMarkers = useMemo(() => {
    if (!data?.player?.keyMoments) return [];

    return data.player.keyMoments.map((moment: any) => ({
      id: `moment-${moment.id}`,
      time: moment.timestampSeconds ? parseFloat(moment.timestampSeconds) : 0,
      label: moment.description || moment.momentType,
      type: moment.sentiment === 'positive' ? 'highlight' : 'moment',
      color: moment.sentiment === 'positive' ? '#22c55e' : moment.sentiment === 'negative' ? '#ef4444' : '#f59e0b',
    }));
  }, [data?.player?.keyMoments]);

  const openVideoAt = (time: number = 0) => {
    setVideoStartTime(time);
    setIsVideoOpen(true);
  };

  async function handleFlag() {
    try {
      const res = await fetch('/api/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'player',
          targetId: playerId,
          reason: 'Coach flagged for review',
        }),
      });
      if (res.ok) {
        setFlagged(true);
      }
    } catch (error) {
      console.error('Failed to flag:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data?.player) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          Failed to load player. Please try again.
        </div>
      </div>
    );
  }

  const { player, game } = data;
  const analysis = player.analysis;
  const grade = analysis?.overallGrade ? parseFloat(analysis.overallGrade) : null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href={`/game/${gameId}`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Game
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Player Thumbnail or Avatar */}
            {player.thumbnailUrl ? (
              <img
                src={player.thumbnailUrl}
                alt={player.displayName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#0f2d52] flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {player.jerseyNumber || '?'}
                </span>
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {player.displayName || `#${player.jerseyNumber}`}
                </h1>
                {player.detectedTeam?.isUserTeam && (
                  <span className="px-2 py-0.5 text-xs bg-[#0f2d52] text-white rounded-full whitespace-nowrap">
                    Your Team
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500 flex-wrap">
                {player.positionGuess && (
                  <span className="capitalize">{player.positionGuess}</span>
                )}
                {player.detectedTeam && (
                  <span className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: player.detectedTeam.primaryJerseyColor || '#0f2d52' }}
                    />
                    <span className="truncate max-w-[100px] sm:max-w-none">
                      {player.detectedTeam.teamName || player.detectedTeam.teamLabel}
                    </span>
                  </span>
                )}
                {game && (
                  <span className="truncate max-w-[100px] sm:max-w-none">
                    {game.name || game.title}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            {/* Flag Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleFlag}
              className={flagged ? 'text-orange-600 border-orange-600' : ''}
            >
              <Flag className="w-4 h-4 mr-1" />
              {flagged ? 'Flagged' : 'Flag'}
            </Button>

            {/* Grade Circle */}
            {grade !== null && <GradeCircle grade={grade} />}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          {analysis?.summary && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
              <p className="text-gray-600 leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* Full Report */}
          {analysis?.fullReport && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Scouting Report</h2>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {analysis.fullReport}
              </div>
            </div>
          )}

          {/* Strengths */}
          {analysis?.strengths && Array.isArray(analysis.strengths) && analysis.strengths.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Strengths
              </h2>
              <ul className="space-y-2">
                {analysis.strengths.map((strength: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600">
                    <Star className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Development Areas */}
          {analysis?.developmentAreas && Array.isArray(analysis.developmentAreas) && analysis.developmentAreas.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-yellow-600" />
                Areas for Development
              </h2>
              <ul className="space-y-2">
                {analysis.developmentAreas.map((area: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tendencies */}
          {analysis?.tendencies && Object.keys(analysis.tendencies).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Tendencies</h2>
              <div className="grid gap-3">
                {Object.entries(analysis.tendencies).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sub-Grades */}
          {(analysis?.athleticismGrade || analysis?.techniqueGrade || analysis?.decisionMakingGrade || analysis?.consistencyGrade) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Grade Breakdown</h3>
              <div className="space-y-4">
                <SubGradeBar
                  label="Athleticism"
                  grade={analysis.athleticismGrade ? parseFloat(analysis.athleticismGrade) : null}
                />
                <SubGradeBar
                  label="Technique"
                  grade={analysis.techniqueGrade ? parseFloat(analysis.techniqueGrade) : null}
                />
                <SubGradeBar
                  label="Decision Making"
                  grade={analysis.decisionMakingGrade ? parseFloat(analysis.decisionMakingGrade) : null}
                />
                <SubGradeBar
                  label="Consistency"
                  grade={analysis.consistencyGrade ? parseFloat(analysis.consistencyGrade) : null}
                />
              </div>
            </div>
          )}

          {/* Key Moments */}
          {player.keyMoments && player.keyMoments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Key Moments</h3>
              <div className="space-y-3">
                {player.keyMoments.map((moment: any) => {
                  const time = moment.timestampSeconds ? parseFloat(moment.timestampSeconds) : null;
                  return (
                    <button
                      key={moment.id}
                      onClick={() => time !== null && openVideoAt(time)}
                      className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${
                              moment.sentiment === 'positive' ? 'bg-green-500' :
                              moment.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {moment.momentType || 'Moment'}
                            </span>
                          </div>
                          {moment.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{moment.description}</p>
                          )}
                        </div>
                        {time !== null && (
                          <div className="flex items-center gap-1 text-[#0f2d52] ml-2">
                            <Play className="w-4 h-4" />
                            <span className="text-sm">
                              {Math.floor(time / 60)}:{Math.floor(time % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metrics */}
          {analysis?.metrics && Object.keys(analysis.metrics).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Metrics</h3>
              <div className="space-y-2">
                {Object.entries(analysis.metrics).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-medium text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Player Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              {player.jerseyNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Jersey Number</span>
                  <span className="font-medium text-gray-900">#{player.jerseyNumber}</span>
                </div>
              )}
              {player.positionGuess && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Position</span>
                  <span className="font-medium text-gray-900 capitalize">{player.positionGuess}</span>
                </div>
              )}
              {player.framesVisible && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Frames Visible</span>
                  <span className="font-medium text-gray-900">{player.framesVisible}</span>
                </div>
              )}
              {player.detectedTeam && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Team</span>
                  <span className="font-medium text-gray-900">
                    {player.detectedTeam.teamName || player.detectedTeam.teamLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {game?.videoUrl && (
        <VideoPlayerModal
          isOpen={isVideoOpen}
          onClose={() => setIsVideoOpen(false)}
          src={game.videoUrl}
          poster={game.thumbnailUrl}
          title={`${player.displayName} - ${game.name || game.title}`}
          markers={videoMarkers}
          initialTime={videoStartTime}
        />
      )}
    </div>
  );
}
