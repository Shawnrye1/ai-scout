'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Video, Users, Target, Clock, BarChart3, Zap, XCircle } from 'lucide-react';

interface Stats {
  pendingReviews: number;
  gamesProcessed: number;
  totalPlayers: number;
  aiAccuracy: number;
  eventsReviewed: number;
  processedToday: number;
  eventsVerified: number;
  eventsRejected: number;
}

interface RecentActivity {
  id: string;
  type: 'verified' | 'rejected' | 'processing' | 'analyzed';
  description: string;
  timestamp: string;
  user?: string;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    pendingReviews: 0,
    gamesProcessed: 0,
    totalPlayers: 0,
    aiAccuracy: 0,
    eventsReviewed: 0,
    processedToday: 0,
    eventsVerified: 0,
    eventsRejected: 0,
  });
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch admin stats
        const statsRes = await fetch('/api/admin/stats');
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(prev => ({
            ...prev,
            gamesProcessed: data.stats?.gamesProcessed || 0,
            totalPlayers: data.stats?.totalPlayers || 0,
            processedToday: data.stats?.processedToday || 0,
          }));
          setActivity(data.recentActivity || []);
        }

        // Fetch training metrics for AI accuracy
        const metricsRes = await fetch('/api/admin/training/metrics');
        if (metricsRes.ok) {
          const metrics = await metricsRes.json();
          setStats(prev => ({
            ...prev,
            aiAccuracy: metrics.verificationRate || 0,
            eventsReviewed: metrics.totalReviewed || 0,
            eventsVerified: metrics.verified || 0,
            eventsRejected: metrics.rejected || 0,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getAccuracyColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-50 dark:bg-green-900/20';
    if (rate >= 60) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  const statCards = [
    {
      label: 'AI Accuracy',
      value: `${stats.aiAccuracy.toFixed(1)}%`,
      icon: Target,
      color: getAccuracyColor(stats.aiAccuracy),
      bgColor: getAccuracyBg(stats.aiAccuracy),
      href: '/admin/performance',
      subtitle: 'Target: 80%+',
    },
    {
      label: 'Events Reviewed',
      value: stats.eventsReviewed,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      href: '/admin/review',
    },
    {
      label: 'Games Analyzed',
      value: stats.gamesProcessed,
      icon: Video,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      href: '/admin/games',
    },
    {
      label: 'Players Detected',
      value: stats.totalPlayers,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      href: '/admin/players',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor Gemini AI analysis accuracy and review detected events
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Gemini 3 Pro</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <a
            key={stat.label}
            href={stat.href}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {loading ? '...' : stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{stat.subtitle}</p>
                )}
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/admin/review"
              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Review AI Detections</span>
            </a>
            <a
              href="/admin/performance"
              className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">View AI Performance</span>
            </a>
            <a
              href="/admin/games"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <Video className="w-5 h-5" />
              <span className="font-medium">Browse All Games</span>
            </a>
          </div>
        </div>

        {/* Review Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Games Today</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{stats.processedToday}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span>Verified Events</span>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">{stats.eventsVerified}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="w-4 h-4" />
                <span>Rejected Events</span>
              </div>
              <span className="font-semibold text-red-600 dark:text-red-400">{stats.eventsRejected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">How to Improve AI Accuracy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Review Events</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verify or reject Gemini's detected events in the Review tab
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Identify Patterns</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Check AI Performance to see which event types have low accuracy
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Refine Prompts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Update Gemini prompts based on rejection patterns to improve accuracy
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No recent activity. Start reviewing events to build your accuracy history.
          </p>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                <div
                  className={`p-2 rounded-full ${
                    item.type === 'verified'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                      : item.type === 'rejected'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                      : item.type === 'analyzed'
                      ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                  }`}
                >
                  {item.type === 'verified' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : item.type === 'rejected' ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{item.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.timestamp} {item.user && `by ${item.user}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
