'use client';

import Link from 'next/link';
import { ArrowRight, Play, Users, BarChart3, Clock, Upload, Zap, Target, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

function Header() {
  return (
    <header className="w-full relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
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

// Rotating text animation component
function RotatingText() {
  const words = ['Player', 'Coach', 'Team'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // "Player" is the longest word, so we use it to set fixed width
  return (
    <span
      className="inline-block relative overflow-hidden text-left"
      style={{ height: '1.3em', lineHeight: '1.3em', minWidth: '3.5em' }}
    >
      <span
        className={`block transition-all duration-300 ease-in-out ${
          isAnimating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {words[currentIndex]}
      </span>
    </span>
  );
}

// Dashboard data for Football and Basketball
const footballDashboard = {
  sport: 'football',
  gameTitle: 'Game Analysis - Lincoln vs Jefferson',
  players: ['#7 - QB', '#23 - RB', '#88 - WR', '#12 - WR', '#56 - OL'],
  selectedPlayer: '#7 - Quarterback',
  playsAnalyzed: 42,
  overallGrade: 84,
  grades: [
    { label: 'Arm', grade: 87 },
    { label: 'Decision', grade: 81 },
    { label: 'Pocket', grade: 79 },
    { label: 'Athletic', grade: 88 },
  ],
  report: 'Composed pocket passer with excellent pre-snap reads. Shows ability to work through progressions on intermediate routes. Arm strength is above average with good ball placement on out routes...',
  accentColor: '#0f2d52',
};

const basketballDashboard = {
  sport: 'basketball',
  gameTitle: 'Game Analysis - Eagles vs Panthers',
  players: ['#3 - PG', '#11 - SG', '#24 - SF', '#32 - PF', '#44 - C'],
  selectedPlayer: '#3 - Point Guard',
  playsAnalyzed: 58,
  overallGrade: 87,
  grades: [
    { label: 'Shooting', grade: 82 },
    { label: 'Passing', grade: 91 },
    { label: 'Defense', grade: 78 },
    { label: 'IQ', grade: 89 },
  ],
  report: 'Elite court vision with ability to create for teammates off pick-and-roll. Demonstrates excellent decision-making in transition, averaging 8.2 assists. Shooting improves in catch-and-shoot situations...',
  accentColor: '#c2410c',
};

// Animated Dashboard component
function AnimatedDashboard() {
  const [isFootball, setIsFootball] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const dashboard = isFootball ? footballDashboard : basketballDashboard;

  const switchSport = (toFootball: boolean) => {
    if (isFootball === toFootball) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setIsFootball(toFootball);
      setIsTransitioning(false);
    }, 200);
  };

  return (
    <div className="relative p-2 sm:p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
      {/* Sport toggle tabs */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-white/10 rounded-lg p-1">
        <button
          onClick={() => switchSport(true)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-300 ${isFootball ? 'bg-white text-[#0f2d52]' : 'text-white/70 hover:text-white'}`}
        >
          Football
        </button>
        <button
          onClick={() => switchSport(false)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-300 ${!isFootball ? 'bg-orange-500 text-white' : 'text-white/70 hover:text-white'}`}
        >
          Basketball
        </button>
      </div>

      <div className={`aspect-[16/9] rounded-xl bg-white shadow-2xl overflow-hidden transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
        <div className="h-full flex flex-col">
          {/* Top bar */}
          <div className="h-12 bg-gray-100 border-b flex items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${isFootball ? 'bg-[#0f2d52] text-white' : 'bg-orange-600 text-white'}`}>
                {isFootball ? 'FOOTBALL' : 'BASKETBALL'}
              </span>
              <span className="text-sm text-gray-500">{dashboard.gameTitle}</span>
            </div>
            <div className="w-20" />
          </div>

          {/* Content */}
          <div className="flex-1 flex">
            {/* Sidebar */}
            <div className="w-48 bg-gray-50 border-r p-4 hidden sm:block">
              <div className="text-xs font-semibold text-gray-400 mb-3">PLAYERS DETECTED</div>
              {dashboard.players.map((player, i) => (
                <div
                  key={i}
                  className={`text-sm py-2 px-3 rounded-lg mb-1 transition-colors ${
                    i === 0
                      ? `text-white ${isFootball ? 'bg-[#0f2d52]' : 'bg-orange-600'}`
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {player}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{dashboard.selectedPlayer}</h3>
                  <p className="text-sm text-gray-500">{dashboard.playsAnalyzed} plays analyzed</p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${isFootball ? 'text-[#0f2d52]' : 'text-orange-600'}`}>
                    {dashboard.overallGrade}
                  </div>
                  <div className="text-xs text-gray-500">Overall Grade</div>
                </div>
              </div>

              {/* Grades */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {dashboard.grades.map((item, i) => (
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
                  {dashboard.report}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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

              {/* Headline with rotating text */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                Your AI Scouting Assistant
              </h1>
              <p className="mt-2 text-4xl sm:text-5xl lg:text-6xl font-bold text-white/60 flex items-baseline justify-center gap-4">
                <span>For Every</span>
                <RotatingText />
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

            {/* Dashboard Preview - now with animation */}
            <div className="mt-16 max-w-5xl mx-auto">
              <AnimatedDashboard />
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
      <footer className="bg-gray-950 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="py-12 lg:py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center mb-4">
                <span className="text-xl font-bold text-white">AI Scout</span>
              </div>
              <p className="text-sm text-gray-400 mb-6 max-w-xs">
                AI-powered scouting reports for every player. Upload game film, get professional analysis in minutes.
              </p>
              {/* Social Icons */}
              <div className="flex items-center gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h3>
              <ul className="space-y-3">
                <li><Link href="/features" className="text-sm hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="text-sm hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#how-it-works" className="text-sm hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/sign-up" className="text-sm hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="text-sm hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="py-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2025 AI Scout. All rights reserved.
            </p>
            <p className="text-sm text-gray-500">
              Made for coaches who want the edge.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
