'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Video,
  Users,
  TrendingUp,
  Clock,
  ChevronRight,
  Star,
  Target,
  BarChart3,
  Play,
  Loader2,
  Plus,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DashboardStats {
  totalGames: number;
  gamesThisMonth: number;
  totalPlayers: number;
  avgPlayerGrade: number;
  processingGames: number;
}

interface TopPlayer {
  id: string;
  displayName: string;
  jerseyNumber: string;
  teamName: string;
  overallGrade: number;
  gameId: string;
  gameName: string;
}

interface RecentGame {
  id: string;
  title: string;
  opponent: string;
  sport: string;
  status: string;
  playerCount: number;
  createdAt: string;
}

interface TrainingStats {
  playerAnnotations: number;
  minAnnotationsRequired: number;
  recommendedAnnotations: number;
  canTrain: boolean;
  trainingProgress: number;
  isTraining: boolean;
  currentMetrics: {
    accuracy: number;
    mAP50: number;
  } | null;
}

export default function CoachDashboard() {
  const { data, isLoading } = useSWR('/api/dashboard', fetcher);
  const { data: trainingData } = useSWR<TrainingStats>('/api/admin/models/stats', fetcher);

  const stats: DashboardStats = data?.stats || {
    totalGames: 0,
    gamesThisMonth: 0,
    totalPlayers: 0,
    avgPlayerGrade: 0,
    processingGames: 0,
  };

  const topPlayers: TopPlayer[] = data?.topPlayers || [];
  const recentGames: RecentGame[] = data?.recentGames || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Coach Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Track your team's performance and player development
          </p>
        </div>
        <Link href="/games/new" className="w-full sm:w-auto">
          <Button className="bg-[#0f2d52] hover:bg-[#1a3d62] w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Upload Game
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-start sm:items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Games</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {isLoading ? '...' : stats.totalGames}
              </p>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                {stats.gamesThisMonth} this month
              </p>
            </div>
            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
              <Video className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-start sm:items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Players</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {isLoading ? '...' : stats.totalPlayers}
              </p>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                Across all games
              </p>
            </div>
            <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-start sm:items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Avg Grade</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {isLoading ? '...' : stats.avgPlayerGrade.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                Team performance
              </p>
            </div>
            <div className="bg-purple-50 p-2 sm:p-3 rounded-lg">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-start sm:items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Processing</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {isLoading ? '...' : stats.processingGames}
              </p>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                Games in queue
              </p>
            </div>
            <div className="bg-orange-50 p-2 sm:p-3 rounded-lg">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Recent Games */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Games</h2>
              <Link
                href="/games"
                className="text-sm text-[#0f2d52] hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : recentGames.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <Video className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No games uploaded yet</p>
                <Link href="/games/new">
                  <Button className="bg-[#0f2d52] hover:bg-[#1a3d62]">
                    Upload Your First Game
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentGames.map((game) => (
                  <Link
                    key={game.id}
                    href={`/game/${game.id}`}
                    className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0f2d52]/10 flex items-center justify-center flex-shrink-0">
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 text-[#0f2d52]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{game.title}</div>
                        <div className="text-xs sm:text-sm text-gray-500 truncate">
                          {game.opponent && `vs ${game.opponent} • `}
                          {game.playerCount} players
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <span
                        className={`px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium ${
                          game.status === 'ready'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {game.status === 'ready' ? 'Complete' : 'Processing'}
                      </span>
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Performers */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Top Performers</h2>
              <Link
                href="/players"
                className="text-sm text-[#0f2d52] hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : topPlayers.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <Star className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No player data yet</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Upload games to see top performers
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topPlayers.slice(0, 5).map((player, index) => (
                  <Link
                    key={player.id}
                    href={`/game/${player.gameId}#player-${player.id}`}
                    className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-5 sm:w-6 text-xs sm:text-sm font-bold text-gray-400">
                      {index + 1}
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0">
                      {player.jerseyNumber || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate text-sm sm:text-base">
                        {player.displayName || `#${player.jerseyNumber}`}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {player.teamName}
                      </div>
                    </div>
                    <div
                      className={`text-base sm:text-lg font-bold ${
                        player.overallGrade >= 80
                          ? 'text-green-600'
                          : player.overallGrade >= 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {player.overallGrade.toFixed(0)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions - Hidden on mobile since we have nav */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 mt-4 sm:mt-6 hidden sm:block">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/games/new"
                className="flex items-center gap-3 p-3 rounded-lg bg-[#0f2d52] text-white hover:bg-[#1a3d62] transition-colors"
              >
                <Video className="w-5 h-5" />
                <span className="font-medium">Upload New Game</span>
              </Link>
              <Link
                href="/players"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">View All Players</span>
              </Link>
              <Link
                href="/reports"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Team Reports</span>
              </Link>
            </div>
          </div>

          {/* ML Training Progress */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 mt-4 sm:mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Model Training</h2>
              <div className={`p-1.5 rounded-lg ${trainingData?.canTrain ? 'bg-green-50' : 'bg-amber-50'}`}>
                <Zap className={`w-4 h-4 ${trainingData?.canTrain ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
            </div>

            {/* Annotation Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-600">Player Annotations</span>
                <span className="font-medium text-gray-900">
                  {trainingData?.playerAnnotations || 0} / {trainingData?.minAnnotationsRequired || 10}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    trainingData?.canTrain ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, trainingData?.trainingProgress || 0)}%` }}
                />
              </div>
              {!trainingData?.canTrain && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Need {(trainingData?.minAnnotationsRequired || 10) - (trainingData?.playerAnnotations || 0)} more to enable training
                </p>
              )}
            </div>

            {/* Training Status */}
            {trainingData?.isTraining ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">Training in progress...</span>
              </div>
            ) : trainingData?.currentMetrics ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <div className="text-sm">
                  <span className="text-green-700 font-medium">Model trained</span>
                  <span className="text-green-600 ml-2">
                    {trainingData.currentMetrics.mAP50.toFixed(1)}% mAP
                  </span>
                </div>
              </div>
            ) : trainingData?.canTrain ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Ready to train!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700">Add more annotations to train</span>
              </div>
            )}

            {/* Link to corrections */}
            <Link
              href="/admin/corrections"
              className="flex items-center justify-between mt-3 text-sm text-[#0f2d52] hover:underline"
            >
              <span>Manage annotations</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
