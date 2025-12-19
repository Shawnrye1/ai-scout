'use client';

import { useState, useEffect } from 'react';
import { Flag, Video, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface Stats {
  pendingCorrections: number;
  gamesProcessed: number;
  totalPlayers: number;
  avgConfidence: number;
  recentCorrections: number;
  processedToday: number;
}

interface RecentActivity {
  id: string;
  type: 'correction' | 'processing' | 'flagged';
  description: string;
  timestamp: string;
  user?: string;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    pendingCorrections: 0,
    gamesProcessed: 0,
    totalPlayers: 0,
    avgConfidence: 0,
    recentCorrections: 0,
    processedToday: 0,
  });
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setActivity(data.recentActivity || []);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Pending Corrections',
      value: stats.pendingCorrections,
      icon: Flag,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin/corrections',
    },
    {
      label: 'Games Processed',
      value: stats.gamesProcessed,
      icon: Video,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/games',
    },
    {
      label: 'Total Players',
      value: stats.totalPlayers,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/admin/players',
    },
    {
      label: 'Avg Confidence',
      value: `${stats.avgConfidence}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Monitor AI performance and manage corrections for model fine-tuning
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <a
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {loading ? '...' : stat.value}
                </p>
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/admin/corrections"
              className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <Flag className="w-5 h-5" />
              <span className="font-medium">Review Flagged Items ({stats.pendingCorrections})</span>
            </a>
            <a
              href="/admin/models"
              className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Model Performance</span>
            </a>
            <a
              href="/admin/games"
              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Video className="w-5 h-5" />
              <span className="font-medium">Browse All Games</span>
            </a>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Games Processed</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.processedToday}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4" />
                <span>Corrections Made</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.recentCorrections}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span>Model Confidence</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.avgConfidence}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div
                  className={`p-2 rounded-full ${
                    item.type === 'correction'
                      ? 'bg-green-100 text-green-600'
                      : item.type === 'flagged'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {item.type === 'correction' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : item.type === 'flagged' ? (
                    <Flag className="w-4 h-4" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
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
