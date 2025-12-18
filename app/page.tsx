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

// Dropdown menu items configuration
const featuresMenu = {
  items: [
    { icon: BarChart3, label: 'Analytics', description: 'Track user behavior and conversions', href: '/features' },
    { icon: Zap, label: 'Automation', description: 'Set up triggers and workflows', href: '/features' },
    { icon: Puzzle, label: 'Integrations', description: 'Connect with your favorite tools', href: '/features' },
  ],
  footer: { label: 'View all features', href: '/features' },
};

const resourcesMenu = {
  items: [
    { icon: FileText, label: 'Documentation', description: 'Start integrating in minutes', href: '/docs' },
    { icon: HelpCircle, label: 'Help Center', description: 'Get answers to your questions', href: '/contact' },
    { icon: Users, label: 'Community', description: 'Join our developer community', href: '/about' },
  ],
  footer: { label: 'Contact support', href: '/contact' },
};

function NavDropdown({
  label,
  menu,
  isOpen,
  onToggle
}: {
  label: string;
  menu: typeof featuresMenu;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white transition-colors"
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-72">
            {/* Menu items */}
            <div className="p-2">
              {menu.items.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0f2d52]/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-[#0f2d52]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
              <Link
                href={menu.footer.href}
                className="flex items-center justify-between text-sm font-medium text-[#0f2d52] hover:text-[#1a4a7a] transition-colors"
              >
                {menu.footer.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  return (
    <header className="w-full relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Logo className="h-8 w-8 sm:h-10 sm:w-10" />
            <span className="text-lg sm:text-xl font-semibold text-white">SaaSBase</span>
          </Link>

          {/* Navigation - desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <NavDropdown
              label="Features"
              menu={featuresMenu}
              isOpen={openMenu === 'features'}
              onToggle={() => toggleMenu('features')}
            />
            <Link href="/pricing" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Pricing
            </Link>
            <NavDropdown
              label="Resources"
              menu={resourcesMenu}
              isOpen={openMenu === 'resources'}
              onToggle={() => toggleMenu('resources')}
            />
            <Link href="/about" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              About
            </Link>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#0f2d52] bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>

      {/* Click outside to close */}
      {openMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenMenu(null)}
        />
      )}
    </header>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with branded background */}
      <section className="relative bg-[#0f2d52] overflow-hidden">
        {/* Background pattern/gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2d52] via-[#1a4a7a] to-[#0f2d52] opacity-50" />

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <Header />

          {/* Hero content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-20 sm:pb-24 lg:pb-32">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left column - Text */}
              <div className="text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-6">
                  <span className="text-xs sm:text-sm font-medium text-white/90">
                    New: AI-powered analytics
                  </span>
                  <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4 text-white/70" />
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                  Grow your users.{' '}
                  <span className="text-white/80">Smarter.</span>
                </h1>

                {/* Subheading */}
                <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-xl mx-auto lg:mx-0">
                  Powerful, self-serve product and growth analytics to help you convert, engage, and retain more users.
                </p>

                {/* Email signup form */}
                <div className="mt-8 sm:mt-10">
                  <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto lg:mx-0">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-lg bg-white text-[#0f2d52] font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                    >
                      Get started
                    </button>
                  </form>
                  <p className="mt-3 text-sm text-white/50">
                    Start your free 14-day trial. No credit card required.
                  </p>
                </div>
              </div>

              {/* Right column - Dashboard mockup */}
              <div className="relative">
                {/* White ring around mockup */}
                <div className="relative p-2 sm:p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                  {/* Mockup placeholder */}
                  <div className="aspect-[4/3] rounded-xl bg-white shadow-2xl overflow-hidden">
                    {/* Fake dashboard UI */}
                    <div className="h-full flex flex-col">
                      {/* Top bar */}
                      <div className="h-10 bg-gray-100 border-b flex items-center px-4 space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 p-4 sm:p-6 bg-gray-50">
                        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                            <div className="text-xs text-gray-500 mb-1">Users</div>
                            <div className="text-lg sm:text-2xl font-bold text-gray-900">12,847</div>
                            <div className="text-xs text-green-600">+12.5%</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                            <div className="text-xs text-gray-500 mb-1">Revenue</div>
                            <div className="text-lg sm:text-2xl font-bold text-gray-900">$48.2k</div>
                            <div className="text-xs text-green-600">+8.2%</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                            <div className="text-xs text-gray-500 mb-1">Active</div>
                            <div className="text-lg sm:text-2xl font-bold text-gray-900">94.2%</div>
                            <div className="text-xs text-green-600">+2.1%</div>
                          </div>
                        </div>
                        {/* Chart placeholder */}
                        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm h-32 sm:h-40">
                          <div className="text-xs text-gray-500 mb-3">Growth over time</div>
                          <div className="flex items-end justify-between h-20 sm:h-24 px-2">
                            {[40, 65, 45, 80, 55, 90, 70, 95, 85, 100, 75, 110].map((h, i) => (
                              <div
                                key={i}
                                className="w-2 sm:w-3 bg-[#0f2d52] rounded-t"
                                style={{ height: `${h * 0.7}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section id="features" className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything you need to grow
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Built for modern teams who want to move fast without breaking things.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Analytics',
                description: 'Track user behavior, conversions, and revenue with powerful dashboards.',
              },
              {
                title: 'Automation',
                description: 'Set up triggers and workflows to engage users at the right moment.',
              },
              {
                title: 'Integrations',
                description: 'Connect with your favorite tools - Slack, Stripe, Zapier, and more.',
              },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6">
                <div className="w-12 h-12 rounded-lg bg-[#0f2d52]/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-[#0f2d52]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of teams already using SaaSBase to grow their business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#0f2d52] text-white font-semibold hover:bg-[#1a4a7a] transition-colors"
            >
              Start free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Logo className="h-8 w-8" />
              <span className="text-lg font-semibold text-gray-900">SaaSBase</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 SaaSBase. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
