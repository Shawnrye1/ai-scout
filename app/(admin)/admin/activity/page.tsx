'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Video,
  Users,
  CheckCircle,
  Flag,
  RefreshCw,
  Clock,
  Filter
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'game_uploaded' | 'game_processed' | 'correction_made' | 'flagged' | 'model_trained';
  description: string;
  details?: string;
  user?: string;
  timestamp: string;
}

const activityIcons: Record<string, any> = {
  game_uploaded: Video,
  game_processed: CheckCircle,
  correction_made: CheckCircle,
  flagged: Flag,
  model_trained: RefreshCw,
};

const activityColors: Record<string, string> = {
  game_uploaded: 'bg-blue-100 text-blue-600',
  game_processed: 'bg-green-100 text-green-600',
  correction_made: 'bg-purple-100 text-purple-600',
  flagged: 'bg-orange-100 text-orange-600',
  model_trained: 'bg-pink-100 text-pink-600',
};

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  async function fetchActivities() {
    try {
      const res = await fetch(`/api/admin/activity?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      } else {
        // Mock data
        setActivities([
          {
            id: '1',
            type: 'game_processed',
            description: 'Game processing completed',
            details: 'Test Game - 7 players detected',
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            type: 'correction_made',
            description: 'Play type corrected',
            details: 'Changed from "Run Play" to "Pass Play"',
            user: 'Admin',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '3',
            type: 'flagged',
            description: 'Player flagged for review',
            details: '#12 - Incorrect team assignment',
            user: 'Coach',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter((a) => a.type === filter);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-600 mt-1">
          Track all system activities and user actions
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-gray-400" />
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            filter === 'all'
              ? 'bg-[#0f2d52] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('game_processed')}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            filter === 'game_processed'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Processing
        </button>
        <button
          onClick={() => setFilter('correction_made')}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            filter === 'correction_made'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Corrections
        </button>
        <button
          onClick={() => setFilter('flagged')}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            filter === 'flagged'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Flagged
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading activity...</div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No activity recorded yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredActivities.map((activity) => {
              const Icon = activityIcons[activity.type] || Activity;
              const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-600';

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 hover:bg-gray-50"
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      {activity.description}
                    </div>
                    {activity.details && (
                      <div className="text-sm text-gray-600 mt-0.5">
                        {activity.details}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                      {activity.user && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {activity.user}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
