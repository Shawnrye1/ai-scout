'use client';

import Link from 'next/link';
import { ArrowRight, Play, Users, BarChart3, Clock, Upload, Zap, Target, TrendingUp } from 'lucide-react';
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
      {/* Football/Play diagram icon */}
      <circle cx="20" cy="16" r="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M12 28L20 20L28 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="28" r="2" fill="white" />
      <circle cx="28" cy="28" r="2" fill="white" />
    </svg>
  );
}

function Header() {
  return (
    <header className="w-full relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Logo className="h-8 w-8 sm:h-10 sm:w-10" />
            <span className="text-lg sm:text-xl font-bold text-white">AI Scout</span>
          </Link>

          {/* Navigation - desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#how-it-works" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#features" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Pricing
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
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-[#0f2d52] overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2d52] via-[#1a4a7a] to-[#0f2d52] opacity-50" />

        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />

        <div className="relative">
          <Header />

          {/* Hero content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-20 sm:pb-24 lg:pb-32">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 mb-6">
                <span className="text-sm font-medium text-orange-300">
                  Football & Basketball
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                Your AI Scouting Assistant
              </h1>
              <p className="mt-2 text-4xl sm:text-5xl lg:text-6xl font-bold text-white/60">
                For Every Player
              </p>

              {/* Subheading */}
              <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
                Upload game film. Get detailed scouting reports in minutes.
                AI-powered analysis for coaches who want the edge.
              </p>

              {/* CTA buttons */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-[#0f2d52] bg-white rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Start Analyzing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Play className="mr-2 h-5 w-5" />
                  See How It Works
                </Link>
              </div>

              {/* Social proof */}
              <div className="mt-12 flex items-center justify-center gap-8 text-white/60">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">500+</div>
                  <div className="text-sm">Games Analyzed</div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">50+</div>
                  <div className="text-sm">Coaches</div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">10k+</div>
                  <div className="text-sm">Players Scouted</div>
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="mt-16 max-w-5xl mx-auto">
              <div className="relative p-2 sm:p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                <div className="aspect-[16/9] rounded-xl bg-white shadow-2xl overflow-hidden">
                  {/* Fake scouting dashboard */}
                  <div className="h-full flex flex-col">
                    {/* Top bar */}
                    <div className="h-12 bg-gray-100 border-b flex items-center justify-between px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <div className="text-sm text-gray-500">Game Analysis - Lincoln vs Jefferson</div>
                      <div className="w-20" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 flex">
                      {/* Sidebar */}
                      <div className="w-48 bg-gray-50 border-r p-4 hidden sm:block">
                        <div className="text-xs font-semibold text-gray-400 mb-3">PLAYERS DETECTED</div>
                        {['#7 - QB', '#23 - RB', '#88 - WR', '#12 - WR', '#56 - OL'].map((player, i) => (
                          <div key={i} className={`text-sm py-2 px-3 rounded-lg mb-1 ${i === 0 ? 'bg-[#0f2d52] text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                            {player}
                          </div>
                        ))}
                      </div>
                      {/* Main content */}
                      <div className="flex-1 p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">#7 - Quarterback</h3>
                            <p className="text-sm text-gray-500">42 plays analyzed</p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-[#0f2d52]">84</div>
                            <div className="text-xs text-gray-500">Overall Grade</div>
                          </div>
                        </div>

                        {/* Grades */}
                        <div className="grid grid-cols-4 gap-3 mb-4">
                          {[
                            { label: 'Arm', grade: 87 },
                            { label: 'Decision', grade: 81 },
                            { label: 'Pocket', grade: 79 },
                            { label: 'Athletic', grade: 88 },
                          ].map((item, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                              <div className="text-xl font-bold text-gray-900">{item.grade}</div>
                              <div className="text-xs text-gray-500">{item.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Report preview */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm font-semibold text-gray-700 mb-2">Scout Report</div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Composed pocket passer with excellent pre-snap reads. Shows ability to work through progressions on intermediate routes.
                            Arm strength is above average with good ball placement on out routes...
                          </p>
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

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              From upload to scouting report in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Upload Game Film',
                description: 'Drop in your game footage - MP4, MOV, or link from YouTube/Hudl. Any angle works.',
              },
              {
                step: '02',
                icon: Zap,
                title: 'AI Analyzes Everything',
                description: 'Our AI detects players, tracks movements, identifies plays, and evaluates performance automatically.',
              },
              {
                step: '03',
                icon: BarChart3,
                title: 'Get Scouting Reports',
                description: 'Receive detailed reports for every player with grades, tendencies, strengths, and areas to develop.',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gray-200 -translate-x-1/2 z-0" />
                )}
                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-[#0f2d52] mb-6">
                    <item.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-sm font-bold text-[#0f2d52] mb-2">STEP {item.step}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              What You Get
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Everything a scout sees, powered by AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Auto Player Detection',
                description: 'AI identifies every player on the field by jersey number. No manual tagging required.',
              },
              {
                icon: Target,
                title: 'Position-Specific Analysis',
                description: 'QB reads, WR routes, RB vision, OL technique - analysis tailored to each position.',
              },
              {
                icon: TrendingUp,
                title: 'Tendencies & Patterns',
                description: 'Discover habits opponents can exploit and strengths to build on.',
              },
              {
                icon: BarChart3,
                title: 'Objective Grades',
                description: 'Every player graded on athleticism, technique, decision-making, and consistency.',
              },
              {
                icon: Clock,
                title: 'Key Moments',
                description: 'Highlights and teaching moments auto-clipped with timestamps for film review.',
              },
              {
                icon: Zap,
                title: 'Fast Turnaround',
                description: 'Full game analysis in under an hour. Get reports before your next practice.',
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-[#0f2d52]/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#0f2d52]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Report Section */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Reports That Sound Like a Real Scout
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Not just numbers - you get natural language analysis that identifies what makes
                each player special and what they need to work on.
              </p>
              <ul className="space-y-4">
                {[
                  'Specific play examples with timestamps',
                  'Comparison to level-appropriate benchmarks',
                  'Actionable development recommendations',
                  'Exportable reports for recruiting',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8">
              <div className="border-l-4 border-[#0f2d52] pl-4 mb-6">
                <div className="text-sm font-semibold text-[#0f2d52]">SAMPLE REPORT EXCERPT</div>
              </div>
              <div className="space-y-4 text-gray-700">
                <p className="font-semibold">Strengths:</p>
                <p className="text-sm leading-relaxed">
                  Shows excellent pre-snap recognition, correctly identifying coverage on
                  78% of passing plays. Demonstrates quick release (avg 2.3 sec) and maintains
                  accuracy under pressure. Best throw of the game came at 14:23 - back shoulder
                  fade against tight coverage.
                </p>
                <p className="font-semibold">Areas for Development:</p>
                <p className="text-sm leading-relaxed">
                  Tends to abandon pocket early when first read is covered. On 3rd & long
                  situations, held ball 3.5+ seconds on 6 of 9 plays, resulting in 2 sacks.
                  Recommend drill work on checkdown timing and pocket movement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 sm:py-24 bg-[#0f2d52]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Scout Smarter?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Join coaches who are using AI to find the edge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white text-[#0f2d52] font-semibold hover:bg-gray-100 transition-colors text-lg"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors text-lg"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Logo className="h-8 w-8" />
              <span className="text-lg font-bold text-white">AI Scout</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 AI Scout. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
