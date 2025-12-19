'use client';

import { useState } from 'react';
import { Settings, Save, RefreshCw, Database, Brain, Mail, Key } from 'lucide-react';

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    autoFlagLowConfidence: true,
    confidenceThreshold: 70,
    autoGenerateReports: true,
    emailOnComplete: true,
    retrainThreshold: 50,
    modalEndpoint: process.env.NEXT_PUBLIC_MODAL_ENDPOINT || '',
  });

  async function handleSave() {
    setSaving(true);
    // In production, save to database
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure system behavior and processing options
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* AI Processing */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Processing</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Auto-flag low confidence detections</div>
                <div className="text-sm text-gray-500">
                  Automatically flag plays below confidence threshold for review
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, autoFlagLowConfidence: !s.autoFlagLowConfidence }))
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.autoFlagLowConfidence ? 'bg-[#0f2d52]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.autoFlagLowConfidence ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Threshold ({settings.confidenceThreshold}%)
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={settings.confidenceThreshold}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, confidenceThreshold: parseInt(e.target.value) }))
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50% (More items flagged)</span>
                <span>95% (Fewer items flagged)</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Auto-generate reports</div>
                <div className="text-sm text-gray-500">
                  Automatically generate scouting reports when processing completes
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, autoGenerateReports: !s.autoGenerateReports }))
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.autoGenerateReports ? 'bg-[#0f2d52]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.autoGenerateReports ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Model Training */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Model Training</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-retrain threshold ({settings.retrainThreshold} corrections)
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={settings.retrainThreshold}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, retrainThreshold: parseInt(e.target.value) }))
                }
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">
                Trigger model retraining after this many new corrections
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Email on processing complete</div>
                <div className="text-sm text-gray-500">
                  Send email notification when game analysis is ready
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, emailOnComplete: !s.emailOnComplete }))
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.emailOnComplete ? 'bg-[#0f2d52]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.emailOnComplete ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modal Endpoint
              </label>
              <input
                type="text"
                value={settings.modalEndpoint}
                onChange={(e) => setSettings((s) => ({ ...s, modalEndpoint: e.target.value }))}
                placeholder="https://your-modal-endpoint.modal.run"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2d52]"
              />
              <div className="text-xs text-gray-500 mt-1">
                The Modal.com endpoint for ML processing
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-[#0f2d52] text-white rounded-lg hover:bg-[#1a3d62] disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
