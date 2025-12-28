'use client';

import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  Loader2,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

export default function CoachReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);
  const { data: game, error, isLoading, mutate } = useSWR(`/api/games/${gameId}`, fetcher);

  const analysis = game?.geminiAnalysis;
  const coachReport = analysis?.coachReport;
  const scoring = analysis?.scoring || { home: 0, away: 0 };

  async function generateReport() {
    try {
      const res = await fetch(`/api/games/${gameId}/report`, { method: 'POST' });
      if (res.ok) {
        mutate(); // Refresh the data
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    if (!coachReport) return;
    const blob = new Blob([coachReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coach-report-${game?.name || gameId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-600">Failed to load game</p>
        <Link href="/games" className="mt-4 text-blue-600 hover:underline">
          Back to Games
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - hidden when printing */}
      <div className="print:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/game/${gameId}`}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Coach Report
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {game.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {coachReport && (
                <>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </>
              )}
              <Button onClick={generateReport} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                {coachReport ? 'Regenerate' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {coachReport ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 print:shadow-none print:border-none">
            {/* Score Banner */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white print:bg-blue-600">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-sm font-medium opacity-80">HOME</div>
                  <div className="text-5xl font-bold">{scoring.home}</div>
                </div>
                <div className="text-2xl font-light opacity-60">vs</div>
                <div className="text-center flex-1">
                  <div className="text-sm font-medium opacity-80">AWAY</div>
                  <div className="text-5xl font-bold">{scoring.away}</div>
                </div>
              </div>
            </div>

            {/* Markdown Report */}
            <article className="prose prose-lg dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white border-b pb-4 mb-6">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-4">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200 mt-6 mb-3">
                      {children}
                    </h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-600 dark:text-gray-300">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900 dark:text-white">
                      {children}
                    </strong>
                  ),
                  hr: () => <hr className="my-8 border-gray-200 dark:border-gray-700" />,
                }}
              >
                {coachReport}
              </ReactMarkdown>
            </article>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Generated by AI Scout</p>
              {analysis?.reportGeneratedAt && (
                <p className="mt-1">
                  Report generated: {new Date(analysis.reportGeneratedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Report Generated Yet
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Generate a professional scouting report from the game analysis.
            </p>
            <Button onClick={generateReport} size="lg">
              <FileText className="w-5 h-5 mr-2" />
              Generate Coach Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
