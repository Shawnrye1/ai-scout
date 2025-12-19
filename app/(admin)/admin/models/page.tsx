'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  RefreshCw,
  Download,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  BarChart3
} from 'lucide-react';

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastUpdated: string;
}

interface Model {
  id: string;
  name: string;
  type: 'detection' | 'tracking' | 'ocr' | 'classification' | 'report_generation';
  version: string;
  status: 'active' | 'training' | 'pending' | 'failed';
  metrics: ModelMetrics;
  trainingDataCount: number;
  lastTrainedAt: string;
}

const modelTypes = {
  detection: { label: 'Player Detection', icon: Brain, color: 'text-blue-600' },
  tracking: { label: 'Player Tracking', icon: TrendingUp, color: 'text-purple-600' },
  ocr: { label: 'Jersey OCR', icon: BarChart3, color: 'text-green-600' },
  classification: { label: 'Play Classification', icon: Brain, color: 'text-orange-600' },
  report_generation: { label: 'Report Generation', icon: Brain, color: 'text-pink-600' },
};

export default function ModelManagement() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrainingModel, setRetrainingModel] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCorrections: 0,
    unusedCorrections: 0,
    lastExport: null as string | null,
  });

  useEffect(() => {
    fetchModels();
    fetchStats();
  }, []);

  async function fetchModels() {
    try {
      const res = await fetch('/api/admin/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      } else {
        // Mock data for now
        setModels([
          {
            id: 'yolov8-player',
            name: 'YOLOv8 Player Detection',
            type: 'detection',
            version: 'v1.2.0',
            status: 'active',
            metrics: { accuracy: 94.2, precision: 92.1, recall: 95.8, f1Score: 93.9, lastUpdated: '2024-01-15' },
            trainingDataCount: 15420,
            lastTrainedAt: '2024-01-15T10:30:00Z',
          },
          {
            id: 'bytetrack',
            name: 'ByteTrack Multi-Object',
            type: 'tracking',
            version: 'v2.1.0',
            status: 'active',
            metrics: { accuracy: 91.5, precision: 89.3, recall: 93.2, f1Score: 91.2, lastUpdated: '2024-01-10' },
            trainingDataCount: 8750,
            lastTrainedAt: '2024-01-10T14:20:00Z',
          },
          {
            id: 'easyocr-jersey',
            name: 'Jersey Number OCR',
            type: 'ocr',
            version: 'v1.0.5',
            status: 'active',
            metrics: { accuracy: 87.3, precision: 85.1, recall: 89.6, f1Score: 87.3, lastUpdated: '2024-01-12' },
            trainingDataCount: 23100,
            lastTrainedAt: '2024-01-12T08:45:00Z',
          },
          {
            id: 'play-classifier',
            name: 'Play Type Classifier',
            type: 'classification',
            version: 'v0.9.2',
            status: 'active',
            metrics: { accuracy: 82.1, precision: 80.5, recall: 83.7, f1Score: 82.1, lastUpdated: '2024-01-08' },
            trainingDataCount: 4200,
            lastTrainedAt: '2024-01-08T16:00:00Z',
          },
        ]);
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
      } else {
        setStats({
          totalCorrections: 142,
          unusedCorrections: 38,
          lastExport: '2024-01-14T12:00:00Z',
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }

  async function triggerRetrain(modelId: string) {
    setRetrainingModel(modelId);
    try {
      const res = await fetch(`/api/admin/models/${modelId}/retrain`, {
        method: 'POST',
      });
      if (res.ok) {
        // Update model status
        setModels((prev) =>
          prev.map((m) =>
            m.id === modelId ? { ...m, status: 'training' as const } : m
          )
        );
      }
    } catch (error) {
      console.error('Failed to trigger retraining:', error);
    } finally {
      setRetrainingModel(null);
    }
  }

  async function exportTrainingData() {
    try {
      const res = await fetch('/api/admin/models/export', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        // Trigger download
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = 'training-data.json';
        link.click();

        // Refresh stats
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to export training data:', error);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ML Model Management</h1>
        <p className="text-gray-600 mt-1">
          Monitor model performance and trigger retraining with corrected data
        </p>
      </div>

      {/* Training Data Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Corrections</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.totalCorrections}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unused for Training</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {stats.unusedCorrections}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ready for next training run</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Export</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {stats.lastExport
                  ? new Date(stats.lastExport).toLocaleDateString()
                  : 'Never'}
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
        <h2 className="text-lg font-semibold text-gray-900">Active Models</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading models...</div>
        ) : (
          <div className="grid gap-4">
            {models.map((model) => {
              const typeConfig = modelTypes[model.type];
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={model.id}
                  className="bg-white rounded-xl border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gray-50`}>
                        <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{model.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {typeConfig.label}
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {model.version}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              model.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : model.status === 'training'
                                ? 'bg-blue-100 text-blue-700'
                                : model.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {model.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => triggerRetrain(model.id)}
                      disabled={model.status === 'training' || retrainingModel === model.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        model.status === 'training' || retrainingModel === model.id
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-[#0f2d52] text-white hover:bg-[#1a3d62]'
                      }`}
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          model.status === 'training' || retrainingModel === model.id
                            ? 'animate-spin'
                            : ''
                        }`}
                      />
                      {model.status === 'training' ? 'Training...' : 'Retrain'}
                    </button>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {model.metrics.accuracy}%
                      </div>
                      <div className="text-xs text-gray-500">Accuracy</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {model.metrics.precision}%
                      </div>
                      <div className="text-xs text-gray-500">Precision</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {model.metrics.recall}%
                      </div>
                      <div className="text-xs text-gray-500">Recall</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {model.metrics.f1Score}%
                      </div>
                      <div className="text-xs text-gray-500">F1 Score</div>
                    </div>
                  </div>

                  {/* Training Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" />
                        {model.trainingDataCount.toLocaleString()} samples
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Last trained: {new Date(model.lastTrainedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Retraining Guide */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Retraining Guide</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Corrections from the queue are automatically added to training data</li>
          <li>• Click "Retrain" to start a new training run on Modal.com</li>
          <li>• Training typically takes 1-4 hours depending on data volume</li>
          <li>• New models are automatically deployed when training completes</li>
          <li>• Export training data to use with external training pipelines</li>
        </ul>
      </div>
    </div>
  );
}
