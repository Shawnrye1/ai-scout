'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  BarChart3,
  TrendingUp,
  Target,
  Users,
  Loader2,
  ChevronRight,
  ChevronDown,
  Play
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TeamReport {
  id: string;
  teamName: string;
  teamLabel: string;
  primaryColor: string;
  isUserTeam: boolean;
  gamesPlayed: number;
  playerCount: number;
  avgGrade: number;
  formationBreakdown: Record<string, number>;
  playTypeBreakdown: Record<string, number>;
  tendencies: string[];
  recentGames: {
    id: string;
    name: string;
    date: string;
    result?: string;
  }[];
}

export default function ReportsPage() {
  const { data, isLoading } = useSWR('/api/reports', fetcher);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const teams: TeamReport[] = data?.teams || [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team Reports</h1>
        <p className="text-gray-600 mt-1">
          Analyze team tendencies and performance patterns
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No team data available yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload game film to start generating reports
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Team Header */}
              <button
                onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: team.primaryColor || '#0f2d52' }}
                  >
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {team.teamName || team.teamLabel || 'Team'}
                      </h2>
                      {team.isUserTeam && (
                        <span className="px-2 py-0.5 text-xs bg-[#0f2d52] text-white rounded-full">
                          Your Team
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {team.gamesPlayed} game{team.gamesPlayed !== 1 ? 's' : ''} •{' '}
                      {team.playerCount} players
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Avg Grade</p>
                    <p
                      className={`text-2xl font-bold ${
                        team.avgGrade >= 80
                          ? 'text-green-600'
                          : team.avgGrade >= 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {team.avgGrade.toFixed(0)}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedTeam === team.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Content */}
              {expandedTeam === team.id && (
                <div className="border-t border-gray-100 p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Formation Breakdown */}
                    {Object.keys(team.formationBreakdown).length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Formation Usage
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(team.formationBreakdown)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5)
                            .map(([formation, percentage]) => (
                              <div key={formation} className="flex items-center gap-3">
                                <div className="w-24 text-sm text-gray-600 truncate">
                                  {formation}
                                </div>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#0f2d52] rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="w-10 text-sm text-gray-500 text-right">
                                  {percentage}%
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Play Type Breakdown */}
                    {Object.keys(team.playTypeBreakdown).length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Play Types
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(team.playTypeBreakdown)
                            .sort(([, a], [, b]) => b - a)
                            .map(([playType, count]) => (
                              <div
                                key={playType}
                                className="bg-gray-50 rounded-lg p-3 text-center"
                              >
                                <div className="text-xl font-bold text-gray-900">
                                  {count}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                  {playType.replace(/_/g, ' ')}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tendencies */}
                  {team.tendencies.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Key Tendencies
                      </h3>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {team.tendencies.map((tendency, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <span className="text-[#0f2d52] mt-1">•</span>
                            {tendency}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recent Games */}
                  {team.recentGames.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Recent Games
                      </h3>
                      <div className="space-y-2">
                        {team.recentGames.map((game) => (
                          <Link
                            key={game.id}
                            href={`/game/${game.id}`}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Play className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {game.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">
                                {new Date(game.date).toLocaleDateString()}
                              </span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
