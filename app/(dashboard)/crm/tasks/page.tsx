'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Filter,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';

// Mock tasks data
const initialTasks = [
  {
    id: 1,
    title: 'Follow up with Acme Corp on proposal',
    description: 'Send revised pricing and discuss implementation timeline',
    contact: 'Sarah Johnson',
    company: 'Acme Corp',
    dueDate: '2024-12-14',
    dueTime: '2:00 PM',
    priority: 'high',
    status: 'pending',
    type: 'call',
  },
  {
    id: 2,
    title: 'Send contract to TechStart',
    description: 'Prepare and send the final contract for annual subscription',
    contact: 'Mike Chen',
    company: 'TechStart Inc',
    dueDate: '2024-12-15',
    dueTime: '10:00 AM',
    priority: 'high',
    status: 'pending',
    type: 'email',
  },
  {
    id: 3,
    title: 'Schedule product demo',
    description: 'Set up a demo call with the technical team',
    contact: 'Lisa Park',
    company: 'Global Systems',
    dueDate: '2024-12-16',
    dueTime: '3:30 PM',
    priority: 'medium',
    status: 'pending',
    type: 'meeting',
  },
  {
    id: 4,
    title: 'Review contract terms with legal',
    description: 'Go through the custom terms requested by DataFlow',
    contact: 'James Wilson',
    company: 'DataFlow Ltd',
    dueDate: '2024-12-17',
    dueTime: '11:00 AM',
    priority: 'medium',
    status: 'pending',
    type: 'task',
  },
  {
    id: 5,
    title: 'Send onboarding materials',
    description: 'Share welcome package and setup documentation',
    contact: 'Emma Davis',
    company: 'CloudBase',
    dueDate: '2024-12-14',
    dueTime: '9:00 AM',
    priority: 'low',
    status: 'completed',
    type: 'email',
  },
  {
    id: 6,
    title: 'Quarterly business review',
    description: 'Prepare QBR presentation for upcoming meeting',
    contact: 'James Wilson',
    company: 'DataFlow Ltd',
    dueDate: '2024-12-20',
    dueTime: '2:00 PM',
    priority: 'medium',
    status: 'pending',
    type: 'meeting',
  },
  {
    id: 7,
    title: 'Check renewal status',
    description: 'Review renewal timeline and prepare renewal proposal',
    contact: 'Robert Taylor',
    company: 'Innovate Labs',
    dueDate: '2024-12-18',
    dueTime: '4:00 PM',
    priority: 'high',
    status: 'pending',
    type: 'task',
  },
  {
    id: 8,
    title: 'Training session follow-up',
    description: 'Send additional resources discussed during training',
    contact: 'Sarah Johnson',
    company: 'Acme Corp',
    dueDate: '2024-12-13',
    dueTime: '5:00 PM',
    priority: 'low',
    status: 'completed',
    type: 'email',
  },
];

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'high':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'medium':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Circle className="h-4 w-4 text-gray-400" />;
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function isOverdue(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, status: task.status === 'completed' ? 'pending' : 'completed' }
          : task
      )
    );
  };

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === 'pending') return task.status === 'pending';
      if (filter === 'completed') return task.status === 'completed';
      return true;
    })
    .filter(
      (task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.contact.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueCount = tasks.filter(
    (t) => t.status === 'pending' && isOverdue(t.dueDate)
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500">
            {pendingCount} pending, {completedCount} completed
            {overdueCount > 0 && (
              <span className="text-red-500 ml-1">({overdueCount} overdue)</span>
            )}
          </p>
        </div>
        <Button className="bg-[#0f2d52] hover:bg-[#1a4a7a]">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'pending' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={filter === 'completed' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setFilter('completed')}
            >
              Completed
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card
            key={task.id}
            className={`transition-all ${
              task.status === 'completed' ? 'opacity-60' : ''
            } ${
              task.status === 'pending' && isOverdue(task.dueDate)
                ? 'border-red-200 bg-red-50/30'
                : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id)}
                  className="mt-1 flex-shrink-0"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 hover:text-gray-400" />
                  )}
                </button>

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3
                        className={`font-medium ${
                          task.status === 'completed'
                            ? 'line-through text-gray-500'
                            : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>
                        {task.contact} at {task.company}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1 ${
                        task.status === 'pending' && isOverdue(task.dueDate)
                          ? 'text-red-600 font-medium'
                          : ''
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(task.dueDate)}</span>
                      <span className="text-gray-400">at {task.dueTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
            <p className="text-gray-500">
              {filter === 'completed'
                ? "You haven't completed any tasks yet."
                : filter === 'pending'
                ? 'All caught up! No pending tasks.'
                : 'Try adjusting your search.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
