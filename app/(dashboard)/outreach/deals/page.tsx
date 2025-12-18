'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Building2,
  DollarSign,
  Calendar,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Mock deals data - Kanban style like Attio
const stages = [
  { id: 'lead', name: 'Lead', color: 'bg-gray-500' },
  { id: 'contacted', name: 'Contacted', color: 'bg-blue-500' },
  { id: 'qualified', name: 'Qualified', color: 'bg-yellow-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-purple-500' },
  { id: 'won', name: 'Won', color: 'bg-green-500' },
];

const deals = [
  {
    id: '1',
    name: 'Dynarex Partnership',
    company: 'Dynarex Corporation',
    value: 25000,
    stage: 'qualified',
    owner: 'You',
    dueDate: 'Dec 20',
    probability: 60,
  },
  {
    id: '2',
    name: 'Drive DeVilbiss Distribution',
    company: 'Drive DeVilbiss',
    value: 50000,
    stage: 'proposal',
    owner: 'You',
    dueDate: 'Dec 25',
    probability: 75,
  },
  {
    id: '3',
    name: 'ResMed Vendor Agreement',
    company: 'ResMed',
    value: 100000,
    stage: 'contacted',
    owner: 'You',
    dueDate: 'Jan 5',
    probability: 30,
  },
  {
    id: '4',
    name: 'Graham Medical Supply',
    company: 'Graham Medical',
    value: 15000,
    stage: 'lead',
    owner: 'You',
    dueDate: 'Jan 10',
    probability: 10,
  },
  {
    id: '5',
    name: 'Carex Health Partnership',
    company: 'Carex Health',
    value: 35000,
    stage: 'qualified',
    owner: 'You',
    dueDate: 'Dec 28',
    probability: 50,
  },
  {
    id: '6',
    name: 'Nova Medical Distribution',
    company: 'Nova Medical',
    value: 20000,
    stage: 'won',
    owner: 'You',
    dueDate: 'Dec 15',
    probability: 100,
  },
  {
    id: '7',
    name: 'Omron Retail Partnership',
    company: 'Omron Healthcare',
    value: 45000,
    stage: 'lead',
    owner: 'You',
    dueDate: 'Jan 15',
    probability: 15,
  },
  {
    id: '8',
    name: 'Fisher & Paykel Supply',
    company: 'Fisher & Paykel',
    value: 80000,
    stage: 'contacted',
    owner: 'You',
    dueDate: 'Jan 20',
    probability: 25,
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DealsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const getDealsForStage = (stageId: string) =>
    deals.filter((deal) => deal.stage === stageId);

  const getStageTotal = (stageId: string) =>
    getDealsForStage(stageId).reduce((sum, deal) => sum + deal.value, 0);

  const totalPipeline = deals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedPipeline = deals.reduce(
    (sum, deal) => sum + deal.value * (deal.probability / 100),
    0
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Deals</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Pipeline: {formatCurrency(totalPipeline)}</span>
            <span>Weighted: {formatCurrency(weightedPipeline)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-sm ${
                view === 'kanban'
                  ? 'bg-muted font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm ${
                view === 'list'
                  ? 'bg-muted font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              List
            </button>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="size-4 mr-1" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            Add Deal
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b px-6 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Kanban Board */}
      {view === 'kanban' ? (
        <div className="flex-1 overflow-auto p-6">
          <div className="flex gap-4 h-full">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className="flex flex-col w-72 flex-shrink-0 rounded-lg bg-muted/30"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${stage.color}`} />
                    <span className="font-medium text-sm">{stage.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getDealsForStage(stage.id).length}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatCurrency(getStageTotal(stage.id))}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  {getDealsForStage(stage.id).map((deal) => (
                    <div
                      key={deal.id}
                      className="rounded-lg border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm">{deal.name}</h3>
                        <Button variant="ghost" size="icon" className="size-6 -mr-1 -mt-1">
                          <MoreHorizontal className="size-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <Building2 className="size-3" />
                        {deal.company}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <DollarSign className="size-3" />
                          {formatCurrency(deal.value)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            {deal.dueDate}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="size-3 text-primary" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {deal.owner}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {deal.probability}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Card Button */}
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Plus className="size-4 mr-1" />
                    Add deal
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left text-sm">
                <th className="px-6 py-3 font-medium text-muted-foreground">Deal</th>
                <th className="px-3 py-3 font-medium text-muted-foreground">Company</th>
                <th className="px-3 py-3 font-medium text-muted-foreground">Value</th>
                <th className="px-3 py-3 font-medium text-muted-foreground">Stage</th>
                <th className="px-3 py-3 font-medium text-muted-foreground">Probability</th>
                <th className="px-3 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="px-3 py-3 font-medium text-muted-foreground">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-muted/50">
                  <td className="px-6 py-3 font-medium">{deal.name}</td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">{deal.company}</td>
                  <td className="px-3 py-3 text-sm font-medium">{formatCurrency(deal.value)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium`}>
                      <div className={`size-2 rounded-full ${stages.find(s => s.id === deal.stage)?.color}`} />
                      {stages.find(s => s.id === deal.stage)?.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">{deal.probability}%</td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">{deal.dueDate}</td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">{deal.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
