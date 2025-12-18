'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  ChevronDown,
  GripVertical,
  Calendar,
  User,
} from 'lucide-react';

// Mock pipeline stages and deals
const stages = [
  { id: 'discovery', name: 'Discovery', color: 'bg-blue-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-purple-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-yellow-500' },
  { id: 'closed-won', name: 'Closed Won', color: 'bg-green-500' },
];

const initialDeals = [
  {
    id: 1,
    name: 'Enterprise License',
    company: 'Acme Corp',
    value: 45000,
    stage: 'negotiation',
    owner: 'Sarah J.',
    closeDate: 'Dec 20',
    probability: 75,
  },
  {
    id: 2,
    name: 'Annual Subscription',
    company: 'TechStart Inc',
    value: 12000,
    stage: 'proposal',
    owner: 'Mike C.',
    closeDate: 'Dec 28',
    probability: 50,
  },
  {
    id: 3,
    name: 'Consulting Package',
    company: 'Global Systems',
    value: 28000,
    stage: 'discovery',
    owner: 'Lisa P.',
    closeDate: 'Jan 5',
    probability: 25,
  },
  {
    id: 4,
    name: 'Platform Migration',
    company: 'DataFlow Ltd',
    value: 65000,
    stage: 'negotiation',
    owner: 'James W.',
    closeDate: 'Dec 22',
    probability: 80,
  },
  {
    id: 5,
    name: 'Support Contract',
    company: 'CloudBase',
    value: 8500,
    stage: 'closed-won',
    owner: 'Emma D.',
    closeDate: 'Dec 10',
    probability: 100,
  },
  {
    id: 6,
    name: 'API Integration',
    company: 'Innovate Labs',
    value: 18000,
    stage: 'discovery',
    owner: 'Sarah J.',
    closeDate: 'Jan 15',
    probability: 20,
  },
  {
    id: 7,
    name: 'Training Package',
    company: 'EduTech Corp',
    value: 9500,
    stage: 'proposal',
    owner: 'Mike C.',
    closeDate: 'Dec 30',
    probability: 40,
  },
  {
    id: 8,
    name: 'Custom Development',
    company: 'BuildRight Inc',
    value: 85000,
    stage: 'discovery',
    owner: 'James W.',
    closeDate: 'Feb 1',
    probability: 15,
  },
];

function DealCard({ deal }: { deal: typeof initialDeals[0] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{deal.name}</h4>
          <p className="text-sm text-gray-500">{deal.company}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-1">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-[#0f2d52]">
            ${deal.value.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {deal.probability}%
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {deal.owner}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {deal.closeDate}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineColumn({ stage, deals }: { stage: typeof stages[0]; deals: typeof initialDeals }) {
  const stageDeals = deals.filter((d) => d.stage === stage.id);
  const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex-1 min-w-[280px] bg-gray-50 rounded-lg p-3">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${stage.color}`} />
          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
          <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {stageDeals.length}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Plus className="h-4 w-4 text-gray-400" />
        </Button>
      </div>

      {/* Column total */}
      <div className="mb-3 text-sm text-gray-500">
        ${totalValue.toLocaleString()}
      </div>

      {/* Deals */}
      <div className="space-y-3">
        {stageDeals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}

export default function DealsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

  const filteredDeals = initialDeals.filter(
    (deal) =>
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPipelineValue = filteredDeals
    .filter((d) => d.stage !== 'closed-won')
    .reduce((sum, d) => sum + d.value, 0);

  const weightedValue = filteredDeals
    .filter((d) => d.stage !== 'closed-won')
    .reduce((sum, d) => sum + d.value * (d.probability / 100), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-500">
            Pipeline: ${totalPipelineValue.toLocaleString()} | Weighted: ${Math.round(weightedValue).toLocaleString()}
          </p>
        </div>
        <Button className="bg-[#0f2d52] hover:bg-[#1a4a7a]">
          <Plus className="mr-2 h-4 w-4" />
          New Deal
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <Button
              variant={viewMode === 'pipeline' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('pipeline')}
            >
              Pipeline
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <PipelineColumn key={stage.id} stage={stage} deals={filteredDeals} />
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Close Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Probability
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-900">{deal.name}</span>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{deal.company}</td>
                      <td className="px-4 py-4 font-medium text-gray-900">
                        ${deal.value.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            stages.find((s) => s.id === deal.stage)?.color
                          } bg-opacity-20 text-gray-800`}
                        >
                          {stages.find((s) => s.id === deal.stage)?.name}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{deal.owner}</td>
                      <td className="px-4 py-4 text-gray-600">{deal.closeDate}</td>
                      <td className="px-4 py-4 text-right text-gray-600">{deal.probability}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
