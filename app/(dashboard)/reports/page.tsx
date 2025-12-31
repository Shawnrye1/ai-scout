'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  FileText,
  User,
  Video,
  Users,
  Loader2,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  Calendar,
  BarChart3,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ReportType = 'player' | 'game' | 'season' | null;

interface PlayerOption {
  id: string;
  jerseyNumber: string;
  displayName: string;
  teamName: string;
  avgGrade: number;
  gamesPlayed: number;
}

interface GameOption {
  id: string;
  name: string;
  date: string;
  playerCount: number;
  status: string;
}

interface PlayerReport {
  jerseyNumber: string;
  displayName: string;
  position: string;
  teamName: string;
  currentGrade: number;
  avgGrade: number;
  gamesPlayed: number;
  trend: 'up' | 'down' | 'stable';
  gradeHistory: { grade: number; date: string; gameName: string }[];
  stats: { points: number; rebounds: number; assists: number };
  tendencies: any;
  strengths: any;
  developmentAreas: string[];
  keyMoments: { description: string; sentiment: string; timestamp: string }[];
}

interface GameReport {
  id: string;
  name: string;
  date: string;
  sport: string;
  homeTeam: { name: string; score?: number; players: any[] };
  awayTeam: { name: string; score?: number; players: any[] };
  topPerformers: { jerseyNumber: string; name: string; grade: number; stats: any }[];
  keyMoments: { description: string; player: string; timestamp: string }[];
  coachingInsights: string[];
}

interface SeasonReport {
  teamName: string;
  gamesPlayed: number;
  avgGrade: number;
  gradeProgression: { date: string; grade: number; gameName: string }[];
  topPlayers: { jerseyNumber: string; name: string; avgGrade: number; gamesPlayed: number }[];
  improvingPlayers: { jerseyNumber: string; name: string; trend: number }[];
  focusAreas: { area: string; playerCount: number }[];
  statLeaders: {
    points: { jerseyNumber: string; value: number };
    rebounds: { jerseyNumber: string; value: number };
    assists: { jerseyNumber: string; value: number };
  };
}

function ReportTypeCard({
  type,
  title,
  description,
  icon: Icon,
  selected,
  onClick,
}: {
  type: ReportType;
  title: string;
  description: string;
  icon: any;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-[#0f2d52] bg-[#0f2d52]/5 dark:bg-[#0f2d52]/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <Icon className={`w-8 h-8 mb-2 ${selected ? 'text-[#0f2d52]' : 'text-gray-400'}`} />
      <h3 className={`font-semibold ${selected ? 'text-[#0f2d52]' : 'text-gray-900 dark:text-white'}`}>
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </button>
  );
}

function PlayerReportPreview({ report }: { report: PlayerReport }) {
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 print:bg-white" id="report-content">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#0f2d52] text-white flex items-center justify-center text-2xl font-bold">
            {report.jerseyNumber}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              #{report.jerseyNumber} {report.displayName !== `#${report.jerseyNumber}` ? report.displayName : ''}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {report.position || 'Position TBD'} • {report.teamName}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-3xl font-bold text-[#0f2d52] dark:text-blue-400">
              {report.currentGrade.toFixed(0)}
            </span>
            {getTrendIcon(report.trend)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {report.gamesPlayed} game{report.gamesPlayed !== 1 ? 's' : ''} analyzed
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {(report.stats.points / report.gamesPlayed).toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">PPG</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {(report.stats.rebounds / report.gamesPlayed).toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">RPG</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {(report.stats.assists / report.gamesPlayed).toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">APG</div>
        </div>
      </div>

      {/* Grade History */}
      {report.gradeHistory.length > 1 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Grade History</h3>
          <div className="flex items-end gap-1 h-16">
            {report.gradeHistory.map((g, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[#0f2d52] rounded-t"
                  style={{ height: `${(g.grade / 100) * 64}px` }}
                  title={`${g.gameName}: ${g.grade}`}
                />
                <span className="text-[8px] text-gray-400 mt-1">{g.grade}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendencies */}
      {report.tendencies && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Player Profile</h3>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
            {typeof report.tendencies === 'object' ? (
              <ul className="space-y-1">
                {report.tendencies.primaryRole && (
                  <li>• <strong>Role:</strong> {report.tendencies.primaryRole}</li>
                )}
                {report.tendencies.offenseStyle && (
                  <li>• <strong>Offense:</strong> {report.tendencies.offenseStyle}</li>
                )}
                {report.tendencies.defenseStyle && (
                  <li>• <strong>Defense:</strong> {report.tendencies.defenseStyle}</li>
                )}
                {report.tendencies.preferredHand && (
                  <li>• <strong>Preferred hand:</strong> {report.tendencies.preferredHand}</li>
                )}
                {report.tendencies.preferredDirection && (
                  <li>• <strong>Tends to go:</strong> {report.tendencies.preferredDirection}</li>
                )}
                {report.tendencies.primaryMoves?.slice(0, 3).map((move: string, i: number) => (
                  <li key={i}>• {move}</li>
                ))}
              </ul>
            ) : (
              report.tendencies
            )}
          </div>
        </div>
      )}

      {/* Strengths */}
      {report.strengths && Array.isArray(report.strengths) && report.strengths.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Strengths</h3>
          <ul className="space-y-1">
            {report.strengths.slice(0, 4).map((strength: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-green-500 mt-0.5">+</span>
                <span>{typeof strength === 'string' ? strength : (strength as any)?.description || ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Development Areas */}
      {report.developmentAreas.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Development Areas</h3>
          <div className="flex flex-wrap gap-2">
            {report.developmentAreas.map((area, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Moments */}
      {report.keyMoments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Moments</h3>
          <div className="space-y-2">
            {report.keyMoments.slice(0, 5).map((moment, i) => (
              <div
                key={i}
                className={`p-2 rounded text-sm ${
                  moment.sentiment === 'positive'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                }`}
              >
                {moment.description}
                {moment.timestamp && (
                  <span className="text-xs opacity-70 ml-2">@ {moment.timestamp}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GameReportPreview({ report }: { report: GameReport }) {
  return (
    <div className="bg-white dark:bg-gray-800 print:bg-white" id="report-content">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{report.name || 'Game Report'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(report.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-[#0f2d52] text-white rounded-full text-sm">
              {report.sport || 'Basketball'}
            </span>
          </div>
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {report.homeTeam.name || 'Home Team'}
          </h3>
          <div className="text-3xl font-bold text-[#0f2d52] dark:text-blue-400">
            {report.homeTeam.score ?? '-'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {report.homeTeam.players.length} players
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {report.awayTeam.name || 'Away Team'}
          </h3>
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-300">
            {report.awayTeam.score ?? '-'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {report.awayTeam.players.length} players
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {report.topPerformers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top Performers</h3>
          <div className="space-y-2">
            {report.topPerformers.slice(0, 5).map((player, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0f2d52] text-white flex items-center justify-center text-sm font-bold">
                    {player.jerseyNumber}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {player.stats && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {player.stats.points || 0}p / {player.stats.rebounds || 0}r / {player.stats.assists || 0}a
                    </span>
                  )}
                  <span className="font-bold text-[#0f2d52] dark:text-blue-400">{player.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coaching Insights */}
      {report.coachingInsights.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Coaching Notes</h3>
          <ul className="space-y-2">
            {report.coachingInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-[#0f2d52] dark:text-blue-400 mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SeasonReportPreview({ report }: { report: SeasonReport }) {
  return (
    <div className="bg-white dark:bg-gray-800 print:bg-white" id="report-content">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{report.teamName}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Season Report • {report.gamesPlayed} Games Analyzed
        </p>
      </div>

      {/* Overall Grade */}
      <div className="flex items-center gap-6 mb-6">
        <div className="w-20 h-20 rounded-full bg-[#0f2d52] text-white flex items-center justify-center text-3xl font-bold">
          {report.avgGrade.toFixed(0)}
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Team Grade</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Average across {report.gamesPlayed} games
          </div>
        </div>
      </div>

      {/* Grade Progression */}
      {report.gradeProgression.length > 1 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Season Progression</h3>
          <div className="flex items-end gap-1 h-20">
            {report.gradeProgression.map((g, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[#0f2d52] rounded-t"
                  style={{ height: `${(g.grade / 100) * 80}px` }}
                  title={`${g.gameName}: ${g.grade}`}
                />
                <span className="text-[8px] text-gray-400 mt-1 truncate w-full text-center">
                  {g.grade.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Leaders */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">PPG Leader</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            #{report.statLeaders.points.jerseyNumber}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
            {(report.statLeaders.points as any).name && (report.statLeaders.points as any).name !== `#${report.statLeaders.points.jerseyNumber}`
              ? (report.statLeaders.points as any).name
              : ''}
          </div>
          <div className="text-sm text-[#0f2d52] dark:text-blue-400 font-semibold">
            {report.statLeaders.points.value.toFixed(1)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">RPG Leader</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            #{report.statLeaders.rebounds.jerseyNumber}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
            {(report.statLeaders.rebounds as any).name && (report.statLeaders.rebounds as any).name !== `#${report.statLeaders.rebounds.jerseyNumber}`
              ? (report.statLeaders.rebounds as any).name
              : ''}
          </div>
          <div className="text-sm text-[#0f2d52] dark:text-blue-400 font-semibold">
            {report.statLeaders.rebounds.value.toFixed(1)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">APG Leader</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            #{report.statLeaders.assists.jerseyNumber}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
            {(report.statLeaders.assists as any).name && (report.statLeaders.assists as any).name !== `#${report.statLeaders.assists.jerseyNumber}`
              ? (report.statLeaders.assists as any).name
              : ''}
          </div>
          <div className="text-sm text-[#0f2d52] dark:text-blue-400 font-semibold">
            {report.statLeaders.assists.value.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Top Players */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top Rated Players</h3>
        <div className="space-y-2">
          {report.topPlayers.slice(0, 5).map((player, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  #{player.jerseyNumber} {player.name && player.name !== `#${player.jerseyNumber}` ? player.name : ''}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {player.gamesPlayed} games
                </span>
                <span className="font-bold text-[#0f2d52] dark:text-blue-400">
                  {player.avgGrade.toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Focus Areas */}
      {report.focusAreas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Team Focus Areas</h3>
          <div className="flex flex-wrap gap-2">
            {report.focusAreas.map((area, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm"
              >
                {area.area} ({area.playerCount})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportModal({
  isOpen,
  onClose,
  title,
  children,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isLoading: boolean;
}) {
  const handlePrint = () => {
    window.print();
  };

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 print:hidden"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 lg:p-16 print:inset-0 print:static print:p-0">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col print:border-0 print:shadow-none print:max-w-none print:rounded-none print:max-h-none">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 print:hidden flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} className="bg-[#0f2d52] hover:bg-[#1a3d62]">
                <Printer className="w-4 h-4 mr-2" />
                Print / Save PDF
              </Button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-content,
          #report-content * {
            visibility: visible;
          }
          #report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </>
  );
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch options
  const { data: playersData } = useSWR('/api/players', fetcher);
  const { data: gamesData } = useSWR('/api/games', fetcher);

  // Fetch actual report data when selected
  const { data: reportData, isLoading: reportLoading } = useSWR(
    modalOpen && selectedId && reportType
      ? `/api/reports/${reportType}/${selectedId}`
      : modalOpen && reportType === 'season'
      ? '/api/reports/season'
      : null,
    fetcher
  );

  // Filter players with stats (games played > 0 and has grade)
  const players: PlayerOption[] = (playersData?.players || []).filter(
    (p: PlayerOption) => p.gamesPlayed > 0 && p.avgGrade !== null && p.avgGrade > 0
  );
  const games: GameOption[] = (gamesData?.games || []).filter(
    (g: any) => g.status === 'ready' && (g.playerCount > 0 || g.detectedPlayers?.length > 0)
  );

  const handleSelectPlayer = (id: string) => {
    setReportType('player');
    setSelectedId(id);
    setModalOpen(true);
  };

  const handleSelectGame = (id: string) => {
    setReportType('game');
    setSelectedId(id);
    setModalOpen(true);
  };

  const handleSelectSeason = () => {
    setReportType('season');
    setSelectedId(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const getModalTitle = () => {
    if (reportType === 'season') return 'Season Report';
    if (reportType === 'game') {
      const game = games.find((g) => g.id === selectedId);
      return game?.name || 'Game Report';
    }
    if (reportType === 'player') {
      const player = players.find((p) => p.id === selectedId);
      return `Player Report - #${player?.jerseyNumber || ''}`;
    }
    return 'Report';
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Generate printable scouting reports and summaries
        </p>
      </div>

      {/* Season Report Button */}
      <button
        onClick={handleSelectSeason}
        className="w-full bg-gradient-to-r from-[#0f2d52] to-[#1a4a7a] rounded-xl p-4 text-left hover:shadow-lg transition-all mb-6"
      >
        <div className="flex items-center gap-4">
          <BarChart3 className="w-10 h-10 text-white/80" />
          <div>
            <h3 className="font-semibold text-white text-lg">Season Report</h3>
            <p className="text-sm text-white/70">
              View team performance across {games.length} games
            </p>
          </div>
          <ChevronRight className="w-6 h-6 text-white/60 ml-auto" />
        </div>
      </button>

      {/* Player Reports Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-[#0f2d52]" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Player Reports</h2>
        </div>

        {players.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No players with stats found. Analyze games first.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => handleSelectPlayer(player.id)}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-left hover:border-[#0f2d52] hover:bg-[#0f2d52]/5 dark:hover:bg-[#0f2d52]/20 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[#0f2d52] text-white flex items-center justify-center font-bold">
                  {player.jerseyNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {player.displayName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {player.gamesPlayed} games • {player.avgGrade?.toFixed(0) || '-'} avg
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Game Reports Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-5 h-5 text-[#0f2d52]" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Game Summaries</h2>
        </div>

        {games.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No analyzed games found.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => handleSelectGame(game.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-left hover:border-[#0f2d52] hover:bg-[#0f2d52]/5 dark:hover:bg-[#0f2d52]/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {game.name || 'Game'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(game.date).toLocaleDateString()} • {game.playerCount} players
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={getModalTitle()}
        isLoading={reportLoading}
      >
        {reportData?.report ? (
          <>
            {reportType === 'player' && <PlayerReportPreview report={reportData.report} />}
            {reportType === 'game' && <GameReportPreview report={reportData.report} />}
            {reportType === 'season' && <SeasonReportPreview report={reportData.report} />}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No report data available</p>
          </div>
        )}
      </ReportModal>
    </div>
  );
}
