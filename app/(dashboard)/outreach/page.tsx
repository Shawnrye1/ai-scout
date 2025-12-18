'use client';

import {
  Users,
  Building2,
  Target,
  Mail,
  Phone,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const stats = [
  {
    name: 'Total Contacts',
    value: '2,847',
    change: '+12.5%',
    changeType: 'positive',
    icon: Users,
  },
  {
    name: 'Companies',
    value: '423',
    change: '+8.2%',
    changeType: 'positive',
    icon: Building2,
  },
  {
    name: 'Active Deals',
    value: '64',
    change: '-2.1%',
    changeType: 'negative',
    icon: Target,
  },
  {
    name: 'Emails Sent',
    value: '1,284',
    change: '+24.3%',
    changeType: 'positive',
    icon: Mail,
  },
];

const recentActivity = [
  {
    id: 1,
    type: 'email',
    icon: Mail,
    content: 'Email sent to Dynarex Corporation',
    timestamp: '2 minutes ago',
    status: 'delivered',
  },
  {
    id: 2,
    type: 'call',
    icon: Phone,
    content: 'AI call completed with Drive DeVilbiss',
    timestamp: '15 minutes ago',
    status: 'completed',
  },
  {
    id: 3,
    type: 'sms',
    icon: MessageSquare,
    content: 'SMS follow-up sent to Graham Medical',
    timestamp: '1 hour ago',
    status: 'delivered',
  },
  {
    id: 4,
    type: 'email',
    icon: Mail,
    content: 'Email opened by ResMed contact',
    timestamp: '2 hours ago',
    status: 'opened',
  },
  {
    id: 5,
    type: 'call',
    icon: Phone,
    content: 'Voicemail left for Omron Healthcare',
    timestamp: '3 hours ago',
    status: 'voicemail',
  },
];

const upcomingTasks = [
  {
    id: 1,
    title: 'Follow up with Dynarex',
    dueDate: 'Today',
    priority: 'high',
  },
  {
    id: 2,
    title: 'Send proposal to Fisher & Paykel',
    dueDate: 'Tomorrow',
    priority: 'medium',
  },
  {
    id: 3,
    title: 'Schedule demo with Carex Health',
    dueDate: 'Dec 18',
    priority: 'low',
  },
];

export default function OutreachOverviewPage() {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div>
          <h1 className="text-lg font-semibold">Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            New Campaign
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="rounded-lg border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <stat.icon className="size-5 text-muted-foreground" />
                <span
                  className={`flex items-center text-xs font-medium ${
                    stat.changeType === 'positive'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="size-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="size-3 mr-0.5" />
                  )}
                  {stat.change}
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.name}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Two column layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-semibold">Recent Activity</h2>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
            <div className="divide-y">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                    <activity.icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp}
                    </p>
                  </div>
                  <div
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      activity.status === 'delivered'
                        ? 'bg-green-100 text-green-700'
                        : activity.status === 'opened'
                        ? 'bg-blue-100 text-blue-700'
                        : activity.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {activity.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-semibold">Upcoming Tasks</h2>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
            <div className="divide-y">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {task.dueDate}
                    </p>
                  </div>
                  <div
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      task.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {task.priority}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t px-6 py-3">
              <Button variant="ghost" size="sm" className="w-full">
                <Plus className="size-4 mr-1" />
                Add Task
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <button className="flex items-center gap-4 rounded-lg border bg-card p-4 text-left hover:bg-accent transition-colors">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
                <Mail className="size-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Send Email Campaign</div>
                <div className="text-sm text-muted-foreground">
                  Reach out to your contacts
                </div>
              </div>
            </button>
            <button className="flex items-center gap-4 rounded-lg border bg-card p-4 text-left hover:bg-accent transition-colors">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
                <Phone className="size-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Start AI Phone Campaign</div>
                <div className="text-sm text-muted-foreground">
                  Automated outbound calls
                </div>
              </div>
            </button>
            <button className="flex items-center gap-4 rounded-lg border bg-card p-4 text-left hover:bg-accent transition-colors">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100">
                <MessageSquare className="size-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">Send SMS Blast</div>
                <div className="text-sm text-muted-foreground">
                  Text message outreach
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
