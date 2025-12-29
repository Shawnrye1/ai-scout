'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  DollarSign,
  Zap,
  Clock,
  FileText,
} from 'lucide-react';

interface PerformanceMetrics {
  totalReviewed: number;
  verified: number;
  rejected: number;
  verificationRate: number;
  eventsAdded: number;
  byStatType: Record<string, { verified: number; rejected: number; rate: number }>;
  byRejectionReason: Record<string, number>;
  improvements: string[];
  recentActivity: Array<{
    id: number;
    type: string;
    action: string;
    reason?: string;
    notes?: string;
    createdAt: string;
  }>;
}

interface GameStats {
  totalGames: number;
  analyzedGames: number;
  averageEventsPerGame: number;
  averageAnalysisTime: number;
}

export default function AIPerformancePage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchGameStats();
  }, []);

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/admin/training/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGameStats() {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setGameStats({
          totalGames: data.totalGames || 0,
          analyzedGames: data.processedGames || 0,
          averageEventsPerGame: data.averageEventsPerGame || 0,
          averageAnalysisTime: data.averageAnalysisTime || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch game stats:', error);
    }
  }

  const getAccuracyColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400';
    if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAccuracyBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (rate >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f2d52]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Performance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track Gemini video analysis accuracy and identify areas for improvement
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Gemini 2.0 Flash</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-6 rounded-xl border ${getAccuracyBg(metrics?.verificationRate || 0)}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getAccuracyBg(metrics?.verificationRate || 0)}`}>
              <Target className={`w-6 h-6 ${getAccuracyColor(metrics?.verificationRate || 0)}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy Rate</p>
              <p className={`text-2xl font-bold ${getAccuracyColor(metrics?.verificationRate || 0)}`}>
                {(metrics?.verificationRate || 0).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Target: 80%+
          </p>
        </div>

        <div className="p-6 rounded-xl border bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Verified Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.verified || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rejected Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.rejected || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Missed Events Added</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.eventsAdded || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy by Stat Type */}
        <div className="p-6 rounded-xl border bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Accuracy by Event Type
          </h2>
          {metrics?.byStatType && Object.keys(metrics.byStatType).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(metrics.byStatType).map(([type, stats]) => (
                <div key={type} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {type}
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stats.rate >= 80 ? 'bg-green-500' : stats.rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${stats.rate}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className={`text-sm font-medium ${getAccuracyColor(stats.rate)}`}>
                      {stats.rate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-20 text-right text-xs text-gray-500 dark:text-gray-400">
                    {stats.verified}/{stats.verified + stats.rejected}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No review data yet. Start reviewing events in the Review tab.
            </p>
          )}
        </div>

        {/* Rejection Reasons */}
        <div className="p-6 rounded-xl border bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Why Events Are Rejected
          </h2>
          {metrics?.byRejectionReason && Object.keys(metrics.byRejectionReason).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(metrics.byRejectionReason)
                .sort(([, a], [, b]) => b - a)
                .map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {reason.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400"
                          style={{ width: `${(count / (metrics.rejected || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No rejections yet. All detected events are being verified!
            </p>
          )}
        </div>
      </div>

      {/* Improvement Suggestions */}
      <div className="p-6 rounded-xl border bg-white dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Prompt Improvement Suggestions
        </h2>
        {metrics?.improvements && metrics.improvements.length > 0 ? (
          <ul className="space-y-2">
            {metrics.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-amber-500 mt-0.5">•</span>
                <span className="text-gray-700 dark:text-gray-300">{improvement}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Review more events to get improvement suggestions.
          </p>
        )}
      </div>

      {/* Recent Review Activity */}
      <div className="p-6 rounded-xl border bg-white dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Review Activity
        </h2>
        {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {metrics.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                {activity.action === 'verify' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {activity.type}
                  </span>
                  {activity.reason && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      - {activity.reason.replace(/_/g, ' ')}
                    </span>
                  )}
                  {activity.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {activity.notes}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No review activity yet.
          </p>
        )}
      </div>

      {/* How to Improve Section */}
      <div className="p-6 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          How to Improve Accuracy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Review Process</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Go to Review Events tab</li>
              <li>Watch video clips and verify AI detections</li>
              <li>Reject incorrect events with specific reasons</li>
              <li>Add any events the AI missed</li>
            </ol>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Using Feedback</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Review rejection patterns above</li>
              <li>Update Gemini prompts based on common errors</li>
              <li>Track accuracy trends over time</li>
              <li>Target 80%+ verification rate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
