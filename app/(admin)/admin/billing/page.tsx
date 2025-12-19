'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  Users,
  TrendingUp,
  Loader2,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RevenueMetrics {
  mrr: number;
  mrrChange: number;
  arr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
}

interface TeamSubscription {
  id: number;
  teamName: string;
  planName: string;
  status: string;
  amount: number;
  nextBillingDate: string;
  gamesUsed: number;
  gamesLimit: number;
  memberCount: number;
}

export default function AdminBillingPage() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<TeamSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [metricsRes, subsRes] = await Promise.all([
        fetch('/api/admin/billing/metrics'),
        fetch('/api/admin/billing/subscriptions'),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics);
      } else {
        // Set demo data for development
        setMetrics({
          mrr: 4850,
          mrrChange: 12.5,
          arr: 58200,
          totalRevenue: 23450,
          activeSubscriptions: 42,
          churnRate: 2.3,
        });
      }

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubscriptions(subsData.subscriptions);
      } else {
        // Set demo data for development
        setSubscriptions([
          {
            id: 1,
            teamName: 'Lincoln High Football',
            planName: 'Pro',
            status: 'active',
            amount: 149,
            nextBillingDate: '2025-01-15',
            gamesUsed: 23,
            gamesLimit: 50,
            memberCount: 4,
          },
          {
            id: 2,
            teamName: 'Eastside Basketball',
            planName: 'Starter',
            status: 'active',
            amount: 49,
            nextBillingDate: '2025-01-12',
            gamesUsed: 8,
            gamesLimit: 10,
            memberCount: 2,
          },
          {
            id: 3,
            teamName: 'Westfield Athletics',
            planName: 'Team',
            status: 'active',
            amount: 299,
            nextBillingDate: '2025-01-20',
            gamesUsed: 67,
            gamesLimit: -1,
            memberCount: 8,
          },
          {
            id: 4,
            teamName: 'Central High',
            planName: 'Pro',
            status: 'past_due',
            amount: 149,
            nextBillingDate: '2025-01-05',
            gamesUsed: 15,
            gamesLimit: 50,
            memberCount: 3,
          },
          {
            id: 5,
            teamName: 'Northside Academy',
            planName: 'Starter',
            status: 'canceled',
            amount: 49,
            nextBillingDate: '2024-12-28',
            gamesUsed: 0,
            gamesLimit: 10,
            memberCount: 1,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.teamName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Revenue</h1>
        <p className="text-gray-500 mt-1">Monitor subscription revenue and manage team billing</p>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-center text-sm">
              {metrics && metrics.mrrChange >= 0 ? (
                <span className="flex items-center text-green-600">
                  <ArrowUpRight className="w-4 h-4" />
                  {metrics.mrrChange}%
                </span>
              ) : (
                <span className="flex items-center text-red-600">
                  <ArrowDownRight className="w-4 h-4" />
                  {metrics?.mrrChange}%
                </span>
              )}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${metrics?.mrr.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Monthly Recurring Revenue</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${metrics?.arr.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Annual Recurring Revenue</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics?.activeSubscriptions}
          </div>
          <div className="text-sm text-gray-500">Active Subscriptions</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics?.churnRate}%
          </div>
          <div className="text-sm text-gray-500">Monthly Churn Rate</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button
          variant="outline"
          onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Stripe Dashboard
        </Button>
        <Button variant="outline">
          Export Revenue Report
        </Button>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Team Subscriptions</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Billing
                </th>
                <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-gray-900">{sub.teamName}</div>
                      <div className="text-sm text-gray-500">{sub.memberCount} members</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0f2d52]/10 text-[#0f2d52]">
                      {sub.planName}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : sub.status === 'past_due'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {sub.status === 'past_due' ? 'Past Due' : sub.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-900">${sub.amount}/mo</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            sub.gamesLimit === -1
                              ? 'bg-[#0f2d52]'
                              : sub.gamesUsed / sub.gamesLimit > 0.8
                              ? 'bg-amber-500'
                              : 'bg-[#0f2d52]'
                          }`}
                          style={{
                            width:
                              sub.gamesLimit === -1
                                ? '30%'
                                : `${Math.min(100, (sub.gamesUsed / sub.gamesLimit) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">
                        {sub.gamesUsed}/{sub.gamesLimit === -1 ? '∞' : sub.gamesLimit}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-500">
                    {new Date(sub.nextBillingDate).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No subscriptions found matching your filters.
          </div>
        )}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
          <div className="space-y-4">
            {[
              { plan: 'Team', amount: 2990, count: 10, color: 'bg-[#0f2d52]' },
              { plan: 'Pro', amount: 1490, count: 10, color: 'bg-blue-500' },
              { plan: 'Starter', amount: 1078, count: 22, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.plan}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.plan}</span>
                  <span className="text-sm text-gray-500">
                    ${item.amount.toLocaleString()} ({item.count} teams)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color}`}
                    style={{
                      width: `${(item.amount / 5558) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {[
              { team: 'Lincoln High Football', amount: 149, type: 'payment', date: 'Today' },
              { team: 'Eastside Basketball', amount: 49, type: 'payment', date: 'Yesterday' },
              { team: 'Central High', amount: 149, type: 'failed', date: '2 days ago' },
              { team: 'Westfield Athletics', amount: 299, type: 'payment', date: '3 days ago' },
            ].map((tx, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{tx.team}</div>
                  <div className="text-xs text-gray-500">{tx.date}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-medium ${
                      tx.type === 'failed' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {tx.type === 'failed' ? '-' : '+'}${tx.amount}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{tx.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
