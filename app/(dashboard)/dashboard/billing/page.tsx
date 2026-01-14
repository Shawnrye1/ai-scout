'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2, ExternalLink, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Subscription {
  planName: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  gamesUsed: number;
  gamesLimit: number;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  pdfUrl: string;
}

const plans = [
  {
    name: 'Starter',
    price: 99,
    gamesPerMonth: 5,
    features: ['5 games/month', 'AI scouting reports', 'Player grades & tendencies', 'Email support'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  },
  {
    name: 'Pro',
    price: 249,
    gamesPerMonth: 10,
    features: ['10 games/month', 'Everything in Starter', 'Player Portal access', 'Priority support'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    highlighted: true,
  },
  {
    name: 'Team',
    price: 499,
    gamesPerMonth: 20,
    features: ['20 games/month', 'Everything in Pro', 'Multiple team members', 'API access'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID,
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [subRes, invRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/billing/invoices'),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    setUpgrading(priceId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to start checkout:', error);
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const currentPlan = subscription?.planName || 'Free';
  const isSubscribed = subscription?.status === 'active';

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 dark:text-white mb-6">
        Billing & Subscription
      </h1>

      {/* Current Plan */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#0f2d52] dark:text-blue-400" />
              Current Plan
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your subscription and billing
            </p>
          </div>
          {isSubscribed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Billing
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{currentPlan}</span>
              {isSubscribed && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                  Active
                </span>
              )}
            </div>
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subscription.status === 'active'
                  ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Expires ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
              </p>
            )}
          </div>

          {subscription && subscription.gamesLimit > 0 && (
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Games this month</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {subscription.gamesUsed} / {subscription.gamesLimit === -1 ? '∞' : subscription.gamesLimit}
              </div>
            </div>
          )}
        </div>

        {!isSubscribed && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">No active subscription</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Upgrade to a paid plan to unlock all features and start analyzing games.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Available Plans */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {isSubscribed ? 'Change Plan' : 'Choose a Plan'}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.name === currentPlan;

            return (
              <div
                key={plan.name}
                className={`relative rounded-xl bg-white dark:bg-gray-800 p-6 border-2 transition-all ${
                  plan.highlighted
                    ? 'border-[#0f2d52] dark:border-blue-500 shadow-sm'
                    : isCurrent
                    ? 'border-green-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.highlighted && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0f2d52] text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                      Current Plan
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                  <span className="text-gray-500 dark:text-gray-400">/month</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-[#0f2d52] dark:text-blue-400" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? 'bg-[#0f2d52] hover:bg-[#1a4a7a]'
                        : ''
                    }`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                    onClick={() => plan.priceId && handleUpgrade(plan.priceId)}
                    disabled={upgrading === plan.priceId}
                  >
                    {upgrading === plan.priceId ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    {isSubscribed ? 'Switch Plan' : 'Upgrade'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      {invoices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      ${(invoice.amount / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#0f2d52] dark:text-blue-400 hover:underline"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Need Help */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Questions about billing?{' '}
        <Link href="/contact" className="text-[#0f2d52] dark:text-blue-400 hover:underline">
          Contact support
        </Link>
      </div>
    </section>
  );
}
