'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Clock, CheckCircle, AlertTriangle, Play, ArrowRight } from 'lucide-react';

interface GameForAnnotation {
  id: string;
  name: string;
  title: string;
  sport: string;
  status: string;
  videoDuration: number;
  playCount: number;
  gapsCount: number;
  coveragePercentage: number;
  annotationStatus: 'pending' | 'in_progress' | 'reviewed';
  createdAt: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AnnotatePage() {
  const [games, setGames] = useState<GameForAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'reviewed'>('pending');

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch('/api/admin/annotate');
        if (res.ok) {
          const data = await res.json();
          setGames(data.games || []);
        }
      } catch (error) {
        console.error('Failed to fetch games:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, []);

  const filteredGames = games.filter(g =>
    filter === 'all' ? true : g.annotationStatus === filter
  );

  const stats = {
    pending: games.filter(g => g.annotationStatus === 'pending').length,
    inProgress: games.filter(g => g.annotationStatus === 'in_progress').length,
    reviewed: games.filter(g => g.annotationStatus === 'reviewed').length,
  };

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Full-Game Annotation
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Review entire games and mark play boundaries for training
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setFilter('pending')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filter === 'in_progress' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filter === 'reviewed' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFilter('reviewed')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reviewed</p>
              <p className="text-2xl font-bold">{stats.reviewed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Games List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Games</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-gray-100 dark:bg-gray-800' : ''}
          >
            Show All
          </Button>
        </CardHeader>
        <CardContent>
          {filteredGames.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No games found for this filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/admin/annotate/${game.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded">
                        <Video className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {game.name || game.title || 'Untitled Game'}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="capitalize">{game.sport}</span>
                          <span>•</span>
                          <span>{formatDuration(game.videoDuration || 0)}</span>
                          <span>•</span>
                          <span>{game.playCount} plays</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Coverage indicator */}
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          game.coveragePercentage >= 95 ? 'text-green-600' :
                          game.coveragePercentage >= 85 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {game.coveragePercentage}%
                        </div>
                        <div className="text-xs text-gray-500">coverage</div>
                      </div>

                      {/* Status badge */}
                      {game.status === 'uploaded' ? (
                        <Badge className="bg-orange-600 hover:bg-orange-700">
                          New Upload
                        </Badge>
                      ) : (
                        <Badge variant={
                          game.annotationStatus === 'reviewed' ? 'default' :
                          game.annotationStatus === 'in_progress' ? 'secondary' :
                          'outline'
                        }>
                          {game.annotationStatus === 'in_progress' ? 'In Progress' :
                           game.annotationStatus.charAt(0).toUpperCase() + game.annotationStatus.slice(1)}
                        </Badge>
                      )}

                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
