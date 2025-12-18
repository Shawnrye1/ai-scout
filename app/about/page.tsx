'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-sm font-medium text-[#0f2d52] transition-colors">
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

const values = [
  {
    title: 'Customer First',
    description: 'Every decision we make starts with the question: "How does this help our customers succeed?"',
  },
  {
    title: 'Simplicity',
    description: 'We believe the best software is invisible. It just works, without getting in your way.',
  },
  {
    title: 'Transparency',
    description: 'No hidden fees, no surprises. We share our roadmap, pricing, and even our challenges openly.',
  },
  {
    title: 'Continuous Improvement',
    description: "We ship weekly. Small, incremental improvements that compound into transformative change.",
  },
];

const stats = [
  { value: '10K+', label: 'Active users' },
  { value: '50M+', label: 'API requests/month' },
  { value: '99.9%', label: 'Uptime' },
  { value: '< 2hr', label: 'Avg. support response' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Building the future of SaaS
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We started with a simple idea: make it easier for businesses to grow.
            Today, we help thousands of teams work smarter, not harder.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Story</h2>
          <div className="prose prose-lg text-gray-600">
            <p className="mb-6">
              SaaSBase was born out of frustration. We were tired of cobbling together
              dozens of tools, each with their own login, their own pricing, their own
              learning curve. There had to be a better way.
            </p>
            <p className="mb-6">
              In 2024, we set out to build that better way. A unified platform that
              handles the essentials - analytics, automation, customer management -
              so teams can focus on what actually matters: their customers.
            </p>
            <p>
              Today, SaaSBase powers thousands of businesses. But we're just getting
              started. Our mission is to democratize the tools that were once only
              available to companies with massive engineering teams and budgets.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[#0f2d52]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These principles guide everything we do, from product decisions to
              how we support our customers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {values.map((value, i) => (
              <div key={i} className="p-6 rounded-xl bg-gray-50">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team placeholder */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet the Team</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A small, passionate team dedicated to building great software.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-32 h-32 rounded-full bg-gray-200 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900">Team Member</h3>
                <p className="text-sm text-gray-500">Role</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Join us on our mission
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Whether you're a customer, partner, or future team member, we'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#0f2d52] text-white font-semibold hover:bg-[#1a4a7a] transition-colors"
            >
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
