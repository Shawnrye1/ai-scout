'use client';

import Link from 'next/link';
import { Plus, Video, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  uploading: { label: 'Uploading', color: 'text-blue-600 bg-blue-50', icon: Loader2 },
  queued: { label: 'Queued', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  detecting: { label: 'Detecting', color: 'text-purple-600 bg-purple-50', icon: Loader2 },
  tracking: { label: 'Tracking', color: 'text-purple-600 bg-purple-50', icon: Loader2 },
  analyzing: { label: 'Analyzing', color: 'text-purple-600 bg-purple-50', icon: Loader2 },
  ready: { label: 'Ready', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-600 bg-red-50', icon: AlertCircle },
};

function GameCard({ game }: { game: any }) {
  const status = statusConfig[game.status] || statusConfig.queued;
  const StatusIcon = status.icon;
  const isProcessing = ['detecting', 'tracking', 'analyzing'].includes(game.status);

  return (
    <Link href={`/game/${game.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#0f2d52]/10 flex items-center justify-center flex-shrink-0">
              <Video className="w-5 h-5 sm:w-6 sm:h-6 text-[#0f2d52]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{game.title}</h3>
              {game.opponent && (
                <p className="text-xs sm:text-sm text-gray-500 truncate">vs {game.opponent}</p>
              )}
            </div>
          </div>
          <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
            <StatusIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{status.label}</span>
          </div>
        </div>

        {/* Progress bar for processing */}
        {isProcessing && (
          <div className="mb-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0f2d52] transition-all duration-500"
                style={{ width: `${game.processingProgress || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{game.processingProgress || 0}% complete</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
          <div className="flex items-center gap-2 sm:gap-4">
            {game.sport && (
              <span className="capitalize">{game.sport}</span>
            )}
            {game.detectedPlayers?.length > 0 && (
              <span>{game.detectedPlayers.length} players</span>
            )}
          </div>
          <span>{new Date(game.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}

export default function GamesPage() {
  const { data, error, isLoading } = useSWR('/api/games', fetcher, {
    refreshInterval: 5000, // Poll every 5s for processing updates
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Game Film</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Upload and analyze your game footage</p>
        </div>
        <Link href="/games/new" className="w-full sm:w-auto">
          <Button className="bg-[#0f2d52] hover:bg-[#1a4a7a] w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Upload Game
          </Button>
        </Link>
      </div>

      {/* Games Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-lg p-4">
          Failed to load games. Please try again.
        </div>
      ) : !data?.games || data.games.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No games yet</h3>
          <p className="text-gray-500 mb-6">Upload your first game film to get started with AI scouting.</p>
          <Link href="/games/new">
            <Button className="bg-[#0f2d52] hover:bg-[#1a4a7a]">
              <Plus className="w-4 h-4 mr-2" />
              Upload Your First Game
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.games.map((game: any) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
