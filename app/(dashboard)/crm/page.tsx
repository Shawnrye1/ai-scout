'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  CircleDollarSign,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';

// Mock data - in production this would come from API
const metrics = [
  {
    title: 'Total Contacts',
    value: '2,847',
    change: '+12.5%',
    trend: 'up',
    icon: Users,
  },
  {
    title: 'Open Deals',
    value: '$284,500',
    change: '+8.2%',
    trend: 'up',
    icon: CircleDollarSign,
  },
  {
    title: 'Won This Month',
    value: '$48,200',
    change: '+23.1%',
    trend: 'up',
    icon: TrendingUp,
  },
  {
    title: 'At Risk Accounts',
    value: '12',
    change: '-3',
    trend: 'down',
    icon: AlertCircle,
  },
];

const recentDeals = [
  { id: 1, name: 'Enterprise License', company: 'Acme Corp', value: 45000, stage: 'Negotiation', health: 'good' },
  { id: 2, name: 'Annual Subscription', company: 'TechStart Inc', value: 12000, stage: 'Proposal', health: 'good' },
  { id: 3, name: 'Consulting Package', company: 'Global Systems', value: 28000, stage: 'Discovery', health: 'warning' },
  { id: 4, name: 'Platform Migration', company: 'DataFlow Ltd', value: 65000, stage: 'Negotiation', health: 'good' },
  { id: 5, name: 'Support Contract', company: 'CloudBase', value: 8500, stage: 'Closed Won', health: 'good' },
];

const recentActivity = [
  { id: 1, type: 'call', contact: 'Sarah Johnson', company: 'Acme Corp', time: '2 hours ago' },
  { id: 2, type: 'email', contact: 'Mike Chen', company: 'TechStart Inc', time: '4 hours ago' },
  { id: 3, type: 'meeting', contact: 'Lisa Park', company: 'Global Systems', time: 'Yesterday' },
  { id: 4, type: 'note', contact: 'James Wilson', company: 'DataFlow Ltd', time: 'Yesterday' },
  { id: 5, type: 'deal', contact: 'Emma Davis', company: 'CloudBase', time: '2 days ago' },
];

const upcomingTasks = [
  { id: 1, title: 'Follow up with Acme Corp', due: 'Today', priority: 'high' },
  { id: 2, title: 'Send proposal to TechStart', due: 'Tomorrow', priority: 'high' },
  { id: 3, title: 'Schedule demo with Global Systems', due: 'Dec 16', priority: 'medium' },
  { id: 4, title: 'Review contract terms', due: 'Dec 17', priority: 'low' },
];

function MetricCard({ metric }: { metric: typeof metrics[0] }) {
  const Icon = metric.icon;
  const isPositive = metric.trend === 'up' && !metric.title.includes('Risk');
  const isNegativeGood = metric.trend === 'down' && metric.title.includes('Risk');

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-[#0f2d52]/10">
            <Icon className="h-5 w-5 text-[#0f2d52]" />
          </div>
          <span
            className={`flex items-center text-sm font-medium ${
              isPositive || isNegativeGood ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {metric.change}
            {metric.trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4 ml-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 ml-1" />
            )}
          </span>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
          <p className="text-sm text-gray-500">{metric.title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function getStageColor(stage: string) {
  switch (stage) {
    case 'Discovery':
      return 'bg-blue-100 text-blue-700';
    case 'Proposal':
      return 'bg-purple-100 text-purple-700';
    case 'Negotiation':
      return 'bg-yellow-100 text-yellow-700';
    case 'Closed Won':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'low':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function CRMDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/crm/contacts">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </Link>
          <Link href="/crm/deals">
            <Button className="bg-[#0f2d52] hover:bg-[#1a4a7a]">
              <Plus className="mr-2 h-4 w-4" />
              New Deal
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <MetricCard key={i} metric={metric} />
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deals - spans 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Deals</CardTitle>
            <Link href="/crm/deals">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{deal.name}</p>
                    <p className="text-sm text-gray-500">{deal.company}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-900">
                      ${deal.value.toLocaleString()}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(
                        deal.stage
                      )}`}
                    >
                      {deal.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Upcoming Tasks</CardTitle>
            <Link href="/crm/tasks">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0f2d52] focus:ring-[#0f2d52]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{task.due}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#0f2d52]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.contact}</span>
                    <span className="text-gray-500"> from </span>
                    <span className="font-medium">{activity.company}</span>
                  </p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
