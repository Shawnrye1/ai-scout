"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Video,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Star,
  Play,
  Loader2,
  Plus,
  Lightbulb,
  Sparkles,
  ClipboardList,
  Target,
  AlertTriangle,
  Award,
  BarChart3,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DashboardStats {
  totalGames: number;
  gamesThisMonth: number;
  totalPlayers: number;
  avgPlayerGrade: number;
  processingGames: number;
}

interface RosterPlayer {
  id: number;
  jerseyNumber: number;
  name: string;
  position: string;
  height: string;
  yearGrade: string;
}

interface SportsTeam {
  name: string;
  sport: string;
  city: string;
  state: string;
  jerseyColorHome: string;
}

interface PlayerDevelopment {
  jerseyNumber: string;
  name: string;
  position: string;
  currentGrade: number;
  gamesPlayed: number;
  trend: "up" | "down" | "stable";
  gradeHistory: { grade: number; date: string }[];
  avgGrade: number;
}

interface PositionBreakdown {
  position: string;
  avgGrade: number;
  playerCount: number;
  players: string[];
}

interface StatLeader {
  jerseyNumber: string;
  name: string;
  value: string;
  total: number;
}

interface SeasonGame {
  gameId: string;
  date: string;
  name: string;
  avgGrade: number;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === "down")
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function MiniSparkline({ data }: { data: { grade: number }[] }) {
  if (data.length < 2) return null;

  const max = Math.max(...data.map((d) => d.grade));
  const min = Math.min(...data.map((d) => d.grade));
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 60;
      const y = 20 - ((d.grade - min) / range) * 16;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="60" height="24" className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-500"
      />
    </svg>
  );
}

function getGradeColor(grade: number): string {
  if (grade >= 85) return "bg-green-500 dark:bg-green-600";
  if (grade >= 75) return "bg-blue-500 dark:bg-blue-600";
  if (grade >= 65) return "bg-yellow-500 dark:bg-yellow-600";
  return "bg-red-500 dark:bg-red-600";
}

function getGradeTextColor(grade: number): string {
  if (grade >= 85) return "text-green-600 dark:text-green-400";
  if (grade >= 75) return "text-blue-600 dark:text-blue-400";
  if (grade >= 65) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function SeasonChart({ data }: { data: SeasonGame[] }) {
  if (data.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {data.map((game, i) => {
        const grade = Math.round(game.avgGrade);
        const date = new Date(game.date);
        const monthDay = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return (
          <Link
            key={game.gameId}
            href={`/game/${game.gameId}`}
            className="flex-shrink-0 w-20 group"
          >
            <div className="flex flex-col items-center gap-1">
              {/* Grade Circle */}
              <div
                className={`w-12 h-12 rounded-full ${getGradeColor(grade)} flex items-center justify-center
                  shadow-sm group-hover:scale-110 transition-transform`}
              >
                <span className="text-white font-bold text-lg">{grade}</span>
              </div>
              {/* Game Name */}
              <div className="text-[10px] text-gray-600 dark:text-gray-400 text-center truncate w-full leading-tight">
                {game.name?.replace("vs ", "") || "Game"}
              </div>
              {/* Date */}
              <div className="text-[9px] text-gray-400 dark:text-gray-500">
                {monthDay}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function CoachDashboard() {
  const { data, isLoading } = useSWR("/api/dashboard", fetcher);

  const stats: DashboardStats = data?.stats || {
    totalGames: 0,
    gamesThisMonth: 0,
    totalPlayers: 0,
    avgPlayerGrade: 0,
    processingGames: 0,
  };

  const roster: RosterPlayer[] = data?.roster || [];
  const sportsTeam: SportsTeam | null = data?.sportsTeam || null;
  const playerDevelopment: PlayerDevelopment[] = data?.playerDevelopment || [];
  const positionBreakdown: PositionBreakdown[] = data?.positionBreakdown || [];
  const statLeaders = data?.statLeaders || {
    points: [],
    rebounds: [],
    assists: [],
  };
  const practiceFocusAreas = data?.practiceFocusAreas || [];
  const teachingMoments = data?.teachingMoments || [];
  const seasonProgression: SeasonGame[] = data?.seasonProgression || [];
  const coachingInsights: string[] = data?.coachingInsights || [];
  const recentGames = data?.recentGames || [];

  // Derived data
  const improvingPlayers = playerDevelopment
    .filter((p) => p.trend === "up")
    .slice(0, 3);
  const decliningPlayers = playerDevelopment
    .filter((p) => p.trend === "down")
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {sportsTeam ? sportsTeam.name : "Coach Dashboard"}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {sportsTeam
              ? `${sportsTeam.city}, ${sportsTeam.state}`
              : "Track your team's performance"}
          </p>
        </div>
        <Link href="/games/new">
          <Button className="bg-[#0f2d52] hover:bg-[#1a3d62] w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Upload Game
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Link
          href="/games"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Games
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : stats.totalGames}
              </p>
            </div>
            <Video className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 opacity-50" />
          </div>
        </Link>

        <Link
          href="/roster"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Roster
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : roster.length || stats.totalPlayers}
              </p>
            </div>
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 opacity-50" />
          </div>
        </Link>

        <Link
          href="/players"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Team Grade
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : stats.avgPlayerGrade.toFixed(0)}
              </p>
            </div>
            <Award className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 opacity-50" />
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Processing
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : stats.processingGames}
              </p>
            </div>
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Left Column - 2 cols */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          {/* Season Progression */}
          {seasonProgression.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Season
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>{" "}
                    85+
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>{" "}
                    75+
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>{" "}
                    65+
                  </span>
                </div>
              </div>
              <SeasonChart data={seasonProgression} />
            </div>
          )}

          {/* Player Development Grid */}
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Improving Players */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Improving
                </h2>
              </div>
              {improvingPlayers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analyze more games to see trends
                </p>
              ) : (
                <div className="space-y-3">
                  {improvingPlayers.map((player) => (
                    <div
                      key={player.jerseyNumber}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center text-sm font-bold">
                        {player.jerseyNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {player.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {player.currentGrade.toFixed(0)} grade
                        </div>
                      </div>
                      <MiniSparkline data={player.gradeHistory} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Needs Attention */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Needs Attention
                </h2>
              </div>
              {decliningPlayers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No declining trends detected
                </p>
              ) : (
                <div className="space-y-3">
                  {decliningPlayers.map((player) => (
                    <div
                      key={player.jerseyNumber}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center text-sm font-bold">
                        {player.jerseyNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {player.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {player.currentGrade.toFixed(0)} grade
                        </div>
                      </div>
                      <MiniSparkline data={player.gradeHistory} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Position Breakdown & Stat Leaders */}
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Position Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  By Position
                </h2>
              </div>
              {positionBreakdown.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No position data yet
                </p>
              ) : (
                <div className="space-y-3">
                  {positionBreakdown.slice(0, 4).map((pos) => (
                    <div
                      key={pos.position}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {pos.position}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {pos.playerCount} player
                          {pos.playerCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          pos.avgGrade >= 80
                            ? "text-green-600 dark:text-green-400"
                            : pos.avgGrade >= 60
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {pos.avgGrade}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stat Leaders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-yellow-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Stat Leaders
                </h2>
              </div>
              {statLeaders.points.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No stats available yet
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Points */}
                  {statLeaders.points[0] && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        PPG
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          #{statLeaders.points[0].jerseyNumber}
                        </span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {statLeaders.points[0].value}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Rebounds */}
                  {statLeaders.rebounds[0] && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        RPG
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          #{statLeaders.rebounds[0].jerseyNumber}
                        </span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {statLeaders.rebounds[0].value}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Assists */}
                  {statLeaders.assists[0] && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        APG
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          #{statLeaders.assists[0].jerseyNumber}
                        </span>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {statLeaders.assists[0].value}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Practice Focus & Teaching Moments */}
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Practice Focus Areas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-red-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Practice Focus
                </h2>
              </div>
              {practiceFocusAreas.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analyze games to identify focus areas
                </p>
              ) : (
                <div className="space-y-2">
                  {practiceFocusAreas.map(
                    (
                      area: { area: string; playerCount: number },
                      i: number,
                    ) => (
                      <div
                        key={area.area}
                        className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {area.area}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {area.playerCount} player
                          {area.playerCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* Teaching Moments */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Play className="w-5 h-5 text-orange-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Film Session
                </h2>
              </div>
              {teachingMoments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No teaching moments flagged
                </p>
              ) : (
                <div className="space-y-2">
                  {teachingMoments.map((moment: any) => (
                    <Link
                      key={moment.id}
                      href={`/game/${moment.gameId}?t=${moment.timestampSeconds}`}
                      className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      <Play className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                          {moment.player}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                          {moment.description}
                        </div>
                      </div>
                      {moment.timestamp && (
                        <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                          {moment.timestamp}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Games */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Recent Games
              </h2>
              <Link
                href="/games"
                className="text-sm text-[#0f2d52] dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : recentGames.length === 0 ? (
              <div className="p-8 text-center">
                <Video className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No games yet
                </p>
                <Link href="/games/new">
                  <Button className="bg-[#0f2d52] hover:bg-[#1a3d62]">
                    Upload Game
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentGames.slice(0, 3).map((game: any) => (
                  <Link
                    key={game.id}
                    href={`/game/${game.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0f2d52]/10 dark:bg-[#0f2d52]/30 flex items-center justify-center">
                        <Play className="w-5 h-5 text-[#0f2d52] dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {game.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {game.playerCount} players
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        game.status === "ready"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {game.status === "ready" ? "Ready" : "Processing"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3 sm:space-y-6">
          {/* Coaching Insights */}
          {coachingInsights.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  AI Insights
                </h2>
              </div>
              <div className="space-y-3">
                {coachingInsights.map((insight: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-yellow-200 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Roster */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#0f2d52] dark:text-blue-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Roster
                </h2>
              </div>
              <Link
                href="/roster"
                className="text-sm text-[#0f2d52] dark:text-blue-400 hover:underline"
              >
                View all
              </Link>
            </div>
            {roster.length === 0 ? (
              <div className="p-6 text-center">
                <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No roster set up
                </p>
                <Link
                  href="/roster"
                  className="text-sm text-[#0f2d52] dark:text-blue-400 hover:underline"
                >
                  Add players
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {roster.slice(0, 6).map((player) => (
                  <div key={player.id} className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-full bg-[#0f2d52] text-white flex items-center justify-center text-sm font-bold">
                      {player.jerseyNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {player.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {player.position} - {player.yearGrade}
                      </div>
                    </div>
                  </div>
                ))}
                {roster.length > 6 && (
                  <div className="p-3 text-center">
                    <Link
                      href="/roster"
                      className="text-sm text-[#0f2d52] dark:text-blue-400 hover:underline"
                    >
                      +{roster.length - 6} more
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Player Development Full List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                All Players
              </h2>
              <Link
                href="/players"
                className="text-sm text-[#0f2d52] dark:text-blue-400 hover:underline"
              >
                Details
              </Link>
            </div>
            {playerDevelopment.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analyze games to track players
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
                {playerDevelopment.map((player) => (
                  <div
                    key={player.jerseyNumber}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-sm font-bold">
                      {player.jerseyNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {player.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {player.gamesPlayed} game
                        {player.gamesPlayed !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon trend={player.trend} />
                      <span
                        className={`text-sm font-bold ${
                          player.currentGrade >= 80
                            ? "text-green-600 dark:text-green-400"
                            : player.currentGrade >= 60
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {player.currentGrade.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
