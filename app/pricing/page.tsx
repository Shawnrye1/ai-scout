'use client';

import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, BarChart3, Zap, Puzzle, HelpCircle, FileText, Users } from 'lucide-react';
import { useState } from 'react';

function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="#0f2d52" />
      <path
        d="M20 10L28 26H12L20 10Z"
        fill="white"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Header() {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link href="/" className="flex items-center space-x-2">
            <Logo className="h-8 w-8 sm:h-10 sm:w-10" />
            <span className="text-lg sm:text-xl font-semibold text-gray-900">SaaSBase</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-[#0f2d52] transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Contact
            </Link>
          </nav>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#0f2d52] rounded-lg hover:bg-[#1a4a7a] transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-12 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Logo className="h-8 w-8" />
            <span className="text-lg font-semibold text-gray-900">SaaSBase</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/about" className="text-sm text-gray-500 hover:text-gray-700">About</Link>
            <Link href="/contact" className="text-sm text-gray-500 hover:text-gray-700">Contact</Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy</Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">Terms</Link>
          </div>
          <p className="text-sm text-gray-500">
            © 2025 SaaSBase. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for trying out the platform',
    price: 0,
    interval: 'month',
    features: [
      'Up to 100 contacts',
      '1 user',
      'Basic analytics',
      'Email support',
      '7-day data retention',
    ],
    cta: 'Start free',
    highlighted: false,
  },
  {
    name: 'Pro',
    description: 'Best for growing businesses',
    price: 29,
    interval: 'month',
    features: [
      'Unlimited contacts',
      'Up to 5 users',
      'Advanced analytics',
      'Priority email support',
      'Unlimited data retention',
      'API access',
      'Custom integrations',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For large-scale operations',
    price: 99,
    interval: 'month',
    features: [
      'Everything in Pro',
      'Unlimited users',
      'Dedicated support',
      'Custom onboarding',
      'SLA guarantee',
      'SSO / SAML',
      'Advanced security',
    ],
    cta: 'Contact sales',
    highlighted: false,
  },
];

const faqs = [
  {
    question: 'Can I change plans later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express) through our secure Stripe integration.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! All paid plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time from your dashboard. No questions asked.',
  },
  {
    question: 'Do you offer refunds?',
    answer: "If you're not satisfied within the first 30 days, we'll give you a full refund.",
  },
  {
    question: 'What happens to my data if I cancel?',
    answer: 'Your data is retained for 30 days after cancellation. You can export everything before then.',
  },
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero */}
      <section className="pt-16 pb-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingInterval === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingInterval === 'year'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-green-600 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl bg-white p-8 shadow-sm border-2 ${
                  plan.highlighted
                    ? 'border-[#0f2d52] ring-1 ring-[#0f2d52]'
                    : 'border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#0f2d52] text-white">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${billingInterval === 'year' ? Math.floor(plan.price * 0.8) : plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500 ml-1">/{billingInterval}</span>
                  )}
                </div>

                <Link
                  href="/sign-up"
                  className={`block w-full text-center py-3 px-4 rounded-lg font-semibold transition-colors mb-6 ${
                    plan.highlighted
                      ? 'bg-[#0f2d52] text-white hover:bg-[#1a4a7a]'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-[#0f2d52] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently asked questions
          </h2>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#0f2d52]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-[#0f2d52] font-semibold hover:bg-gray-100 transition-colors"
          >
            Start free trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
