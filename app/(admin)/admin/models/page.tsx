'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Loader2,
  XCircle,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface ModelMetrics {
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  mAP50: number | null;
  mAP5095: number | null;
  lastUpdated: string | null;
}

interface MetricsDelta {
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  mAP50: number | null;
  mAP5095: number | null;
}

interface PreviousMetrics {
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  mAP50: number | null;
  mAP5095: number | null;
  trainedAt: string | null;
}

interface Model {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'active' | 'training' | 'pending' | 'failed';
  isTrainable: boolean;
  hasTrained: boolean;
  metrics: ModelMetrics;
  previousMetrics?: PreviousMetrics | null;
  delta?: MetricsDelta | null;
  trainingDataCount: number;
  trainingCount?: number;
  lastTrainedAt: string | null;
  message?: string;
  benchmark?: string | null;
  benchmarkNote?: string | null;
}

interface TrainingHistory {
  id: string;
  modelType: string;
  status: string;
  progress: number | null;
  currentEpoch: number | null;
  trainingDataCount: number | null;
  epochs: number | null;
  durationSeconds: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

interface Stats {
  totalCorrections: number;
  unusedCorrections: number;
  playerAnnotations: number;
  minAnnotationsRequired: number;
  canTrain: boolean;
  trainingProgress: number;
  annotationsNeeded: number;
  isTraining: boolean;
  currentMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    mAP50: number;
    version: string;
  } | null;
}

const modelTypes: Record<string, { label: string; icon: typeof Brain; color: string }> = {
  player_detection: { label: 'Player Detection', icon: Brain, color: 'text-blue-600' },
  tracking: { label: 'Player Tracking', icon: TrendingUp, color: 'text-purple-600' },
  ocr: { label: 'Jersey OCR', icon: BarChart3, color: 'text-green-600' },
  play_classification: { label: 'Play Classification', icon: Brain, color: 'text-orange-600' },
};

export default function ModelManagement() {
  const [models, setModels] = useState<Model[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrainingModel, setRetrainingModel] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchModels();
    fetchStats();
    // Poll for updates if training is in progress
    const interval = setInterval(() => {
      fetchModels();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchModels() {
    try {
      const res = await fetch('/api/admin/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
        setTrainingHistory(data.trainingHistory || []);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/models/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }

  async function triggerRetrain(modelType: string) {
    if (!stats?.canTrain) {
      alert(`Need ${stats?.annotationsNeeded || 10} more annotations before training`);
      return;
    }

    setRetrainingModel(modelType);
    try {
      const res = await fetch('/api/admin/training/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_type: modelType }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Training started! This will take 30-60 minutes.');
        fetchModels();
        fetchStats();
      } else {
        alert(data.message || data.error || 'Failed to start training');
      }
    } catch (error) {
      console.error('Failed to trigger retraining:', error);
      alert('Failed to start training');
    } finally {
      setRetrainingModel(null);
    }
  }

  async function exportTrainingData() {
    try {
      const res = await fetch('/api/admin/training?format=json');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `training-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export training data:', error);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ML Model Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitor model performance and trigger retraining with corrected data
        </p>
      </div>

      {/* Training Readiness Card */}
      {stats && (
        <div className={`mb-8 p-6 rounded-xl border ${
          stats.canTrain
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className={`w-8 h-8 ${stats.canTrain ? 'text-green-600' : 'text-blue-600'}`} />
              <div>
                <h2 className={`text-lg font-semibold ${stats.canTrain ? 'text-green-800 dark:text-green-300' : 'text-blue-800 dark:text-blue-300'}`}>
                  Training Readiness
                </h2>
                <p className={`text-sm ${stats.canTrain ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`}>
                  {stats.canTrain
                    ? stats.isTraining
                      ? 'Training in progress...'
                      : 'Ready to train with your annotations!'
                    : `Need ${stats.annotationsNeeded} more player annotations to start training`
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${stats.canTrain ? 'text-green-600' : 'text-blue-600'}`}>
                {stats.playerAnnotations}/{stats.minAnnotationsRequired}
              </div>
              <div className="text-sm text-gray-500">player annotations</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
            <div
              className={`h-full rounded-full transition-all ${stats.canTrain ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${stats.trainingProgress}%` }}
            />
          </div>

          {/* Current metrics if trained */}
          {stats.currentMetrics && (
            <div className="grid grid-cols-5 gap-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.currentMetrics.mAP50.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">mAP@50</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.currentMetrics.precision.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Precision</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.currentMetrics.recall.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Recall</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.currentMetrics.f1Score.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">F1 Score</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.currentMetrics.version}
                </div>
                <div className="text-xs text-gray-500">Version</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Corrections</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats?.totalCorrections || 0}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Player Annotations</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats?.playerAnnotations || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Used for training</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
              <Brain className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Export Data</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                Download JSON
              </p>
            </div>
            <button
              onClick={exportTrainingData}
              className="flex items-center gap-2 px-4 py-2 bg-[#0f2d52] text-white rounded-lg hover:bg-[#1a3d62] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Models Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Models</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Loading models...
          </div>
        ) : (
          <div className="grid gap-4">
            {models.map((model) => {
              const typeConfig = modelTypes[model.type] || { label: model.type, icon: Brain, color: 'text-gray-600' };
              const TypeIcon = typeConfig.icon;
              const isTraining = model.status === 'training' || retrainingModel === model.type;

              return (
                <div
                  key={model.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{model.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {typeConfig.label}
                          </span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                            {model.version}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              model.status === 'active'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : model.status === 'training'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : model.status === 'failed'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {model.status}
                          </span>
                          {!model.isTrainable && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              Pretrained only
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {model.isTrainable && (
                      <button
                        onClick={() => triggerRetrain(model.type)}
                        disabled={isTraining || !stats?.canTrain}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          isTraining || !stats?.canTrain
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-[#0f2d52] text-white hover:bg-[#1a3d62]'
                        }`}
                      >
                        <RefreshCw className={`w-4 h-4 ${isTraining ? 'animate-spin' : ''}`} />
                        {isTraining ? 'Training...' : 'Train'}
                      </button>
                    )}
                  </div>

                  {/* Metrics */}
                  {model.hasTrained && model.metrics.mAP50 !== null ? (
                    <div className="space-y-4 mb-4">
                      {/* Current Metrics */}
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { key: 'mAP50', label: 'mAP@50', value: model.metrics.mAP50, delta: model.delta?.mAP50 },
                          { key: 'precision', label: 'Precision', value: model.metrics.precision, delta: model.delta?.precision },
                          { key: 'recall', label: 'Recall', value: model.metrics.recall, delta: model.delta?.recall },
                          { key: 'f1Score', label: 'F1 Score', value: model.metrics.f1Score, delta: model.delta?.f1Score },
                        ].map(({ key, label, value, delta }) => (
                          <div key={key} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {value?.toFixed(1) || '-'}%
                            </div>
                            <div className="text-xs text-gray-500">{label}</div>
                            {delta !== null && delta !== undefined && (
                              <div className={`flex items-center justify-center gap-1 mt-1 text-xs font-medium ${
                                delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                              }`}>
                                {delta > 0 ? (
                                  <ArrowUp className="w-3 h-3" />
                                ) : delta < 0 ? (
                                  <ArrowDown className="w-3 h-3" />
                                ) : (
                                  <Minus className="w-3 h-3" />
                                )}
                                {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Previous Metrics Comparison */}
                      {model.previousMetrics && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              Comparison to Previous Training
                            </span>
                            {model.previousMetrics.trainedAt && (
                              <span className="text-xs text-blue-600 dark:text-blue-400">
                                ({model.previousMetrics.trainedAt})
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-3 text-sm">
                            {[
                              { label: 'mAP@50', prev: model.previousMetrics.mAP50, curr: model.metrics.mAP50 },
                              { label: 'Precision', prev: model.previousMetrics.precision, curr: model.metrics.precision },
                              { label: 'Recall', prev: model.previousMetrics.recall, curr: model.metrics.recall },
                              { label: 'F1', prev: model.previousMetrics.f1Score, curr: model.metrics.f1Score },
                            ].map(({ label, prev, curr }) => (
                              <div key={label} className="text-center">
                                <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">{label}</div>
                                <div className="text-gray-500 dark:text-gray-400">
                                  {prev?.toFixed(1) || '-'}% → {curr?.toFixed(1) || '-'}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* First training indicator */}
                      {!model.previousMetrics && model.trainingCount === 1 && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
                          <span className="text-sm text-green-700 dark:text-green-400">
                            First training complete! Train again after adding more annotations to see improvement.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : !model.isTrainable && model.metrics.accuracy !== null ? (
                    // Pretrained model with benchmark metrics
                    <div className="space-y-4 mb-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {model.metrics.accuracy?.toFixed(1) || '-'}%
                          </div>
                          <div className="text-xs text-gray-500">Accuracy</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {model.metrics.precision?.toFixed(1) || '-'}%
                          </div>
                          <div className="text-xs text-gray-500">Precision</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {model.metrics.recall?.toFixed(1) || '-'}%
                          </div>
                          <div className="text-xs text-gray-500">Recall</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {model.metrics.f1Score?.toFixed(1) || '-'}%
                          </div>
                          <div className="text-xs text-gray-500">F1 Score</div>
                        </div>
                      </div>
                      {model.benchmark && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 text-center">
                          <span className="text-sm text-purple-700 dark:text-purple-400">
                            Benchmark: {model.benchmark} {model.benchmarkNote && `- ${model.benchmarkNote}`}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        {model.message || (model.isTrainable
                          ? 'Not yet trained. Add annotations and start training to see metrics.'
                          : 'Uses pretrained weights. No custom training metrics.'
                        )}
                      </p>
                    </div>
                  )}

                  {/* Training Info */}
                  {model.hasTrained && (
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {model.trainingDataCount.toLocaleString()} annotations
                        </span>
                        {model.trainingCount && model.trainingCount > 1 && (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-4 h-4" />
                            {model.trainingCount} training runs
                          </span>
                        )}
                        {model.lastTrainedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Trained: {new Date(model.lastTrainedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Training History */}
      {trainingHistory.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Training History</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {trainingHistory.map((run) => (
                  <tr key={run.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {modelTypes[run.modelType]?.label || run.modelType}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                        run.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : run.status === 'training'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : run.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                      }`}>
                        {run.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {run.status === 'training' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {run.status === 'failed' && <XCircle className="w-3 h-3" />}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {run.status === 'training' || run.status === 'downloading' || run.status === 'validating' || run.status === 'uploading' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${run.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[3rem]">
                            {run.progress || 0}%
                          </span>
                          {run.currentEpoch && run.epochs && (
                            <span className="text-xs text-gray-400">
                              (E{run.currentEpoch}/{run.epochs})
                            </span>
                          )}
                        </div>
                      ) : run.status === 'completed' ? (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">100%</span>
                      ) : run.status === 'failed' ? (
                        <span className="text-xs text-red-500">-</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {run.trainingDataCount || '-'} annotations
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {run.durationSeconds ? `${Math.round(run.durationSeconds / 60)}m` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {run.startedAt ? new Date(run.startedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Retraining Guide */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">How Training Works</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>1. Label players in Label Studio (from Training Queue page)</li>
          <li>2. Reach 10+ player annotations (100+ recommended for good results)</li>
          <li>3. Click "Train" to start fine-tuning on Modal.com (takes 30-60 minutes)</li>
          <li>4. Real metrics (mAP, Precision, Recall, F1) appear after training completes</li>
          <li>5. Compare metrics before/after to see if your annotations are helping</li>
        </ul>
      </div>
    </div>
  );
}
