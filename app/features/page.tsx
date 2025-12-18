'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Zap,
  Puzzle,
  Shield,
  Users,
  Globe,
  Smartphone,
  Clock,
  Check,
  Bot,
} from 'lucide-react';

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
            <Link href="/features" className="text-sm font-medium text-[#0f2d52] transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
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

const mainFeatures = [
  {
    icon: BarChart3,
    title: 'Powerful Analytics',
    description:
      'Track user behavior, conversions, and revenue with beautiful dashboards. Get insights that actually help you grow.',
    benefits: [
      'Real-time data updates',
      'Custom dashboards',
      'Funnel analysis',
      'Cohort tracking',
    ],
  },
  {
    icon: Zap,
    title: 'Smart Automation',
    description:
      'Set up triggers and workflows to engage users at the right moment. No coding required.',
    benefits: [
      'Visual workflow builder',
      'Event-based triggers',
      'A/B testing built-in',
      'Scheduled campaigns',
    ],
  },
  {
    icon: Users,
    title: 'CRM & Contacts',
    description:
      'Manage your customers, deals, and communications in one place. Never lose track of a lead again.',
    benefits: [
      'Contact management',
      'Deal pipeline',
      'Task tracking',
      'Activity history',
    ],
  },
  {
    icon: Bot,
    title: 'AI Assistant',
    description:
      'Built-in AI chat that understands your business. Get help with customer questions, drafting emails, and more.',
    benefits: [
      'Contextual responses',
      'Streaming chat',
      'Customizable personality',
      'API access',
    ],
  },
];

const additionalFeatures = [
  {
    icon: Puzzle,
    title: 'Integrations',
    description: 'Connect with Slack, Stripe, Zapier, and 50+ other tools.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with SSO, SAML, and audit logs.',
  },
  {
    icon: Globe,
    title: 'Global CDN',
    description: 'Lightning-fast performance worldwide with 99.9% uptime.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Ready',
    description: 'Full functionality on any device with native mobile apps.',
  },
  {
    icon: Clock,
    title: 'Real-time Sync',
    description: 'All data syncs instantly across your team.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Shared workspaces, permissions, and team analytics.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Everything you need to grow
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            A complete platform for analytics, automation, and customer management.
            Built for teams who want to move fast.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#0f2d52] text-white font-semibold hover:bg-[#1a4a7a] transition-colors"
          >
            Start free trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Main features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {mainFeatures.map((feature, i) => (
              <div
                key={i}
                className={`grid md:grid-cols-2 gap-12 items-center ${
                  i % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="w-14 h-14 rounded-xl bg-[#0f2d52]/10 flex items-center justify-center mb-6">
                    <feature.icon className="h-7 w-7 text-[#0f2d52]" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {feature.title}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">{feature.description}</p>
                  <ul className="space-y-3">
                    {feature.benefits.map((benefit, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-[#0f2d52]" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={i % 2 === 1 ? 'md:order-1' : ''}>
                  {/* Placeholder for feature image/demo */}
                  <div className="aspect-[4/3] rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <feature.icon className="h-20 w-20 text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional features grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              And much more...
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to run your business, all in one place.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {additionalFeatures.map((feature, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-12 h-12 rounded-lg bg-[#0f2d52]/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-[#0f2d52]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#0f2d52]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-[#0f2d52] font-semibold hover:bg-gray-100 transition-colors"
            >
              Start free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Request a demo
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
