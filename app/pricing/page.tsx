'use client';

import Link from 'next/link';
import { ArrowRight, Check, Video, Users, Zap, BarChart3, Shield, Clock, Star, MessageCircle } from 'lucide-react';
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
      <circle cx="20" cy="16" r="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M12 28L20 20L28 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="28" r="2" fill="white" />
      <circle cx="28" cy="28" r="2" fill="white" />
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
            <span className="text-lg sm:text-xl font-semibold text-gray-900">AI Scout</span>
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
            <span className="text-lg font-semibold text-gray-900">AI Scout</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/about" className="text-sm text-gray-500 hover:text-gray-700">About</Link>
            <Link href="/contact" className="text-sm text-gray-500 hover:text-gray-700">Contact</Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy</Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">Terms</Link>
          </div>
          <p className="text-sm text-gray-500">
            © 2025 AI Scout. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for individual coaches',
    price: 49,
    interval: 'month',
    gamesPerMonth: 10,
    features: [
      '10 game films/month',
      'All player scouting reports',
      'Team tendency analysis',
      'Video playback with markers',
      'Email support',
      'Football & Basketball',
    ],
    cta: 'Start free trial',
    highlighted: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  },
  {
    name: 'Pro',
    description: 'For serious programs',
    price: 149,
    interval: 'month',
    gamesPerMonth: 50,
    features: [
      '50 game films/month',
      'Everything in Starter',
      'Priority processing',
      'Advanced player metrics',
      'Cross-game player tracking',
      'Export reports to PDF',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlighted: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    name: 'Team',
    description: 'For athletic departments',
    price: 299,
    interval: 'month',
    gamesPerMonth: -1, // unlimited
    features: [
      'Unlimited game films',
      'Everything in Pro',
      'Multiple sports/teams',
      'Up to 10 coach accounts',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'Training sessions',
    ],
    cta: 'Contact sales',
    highlighted: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID,
  },
];

const faqs = [
  {
    question: 'How does AI Scout analyze game film?',
    answer: 'We use advanced computer vision and AI to automatically detect players, read jersey numbers, track movements, and segment plays. Our system then analyzes each player\'s performance and generates detailed scouting reports.',
  },
  {
    question: 'What video formats are supported?',
    answer: 'We support most common video formats including MP4, MOV, and AVI. Videos can be up to 5GB in size. Higher quality video produces better analysis results.',
  },
  {
    question: 'How long does analysis take?',
    answer: 'Most game films are analyzed within 30-60 minutes, depending on length and quality. Pro and Team plans get priority processing for faster results.',
  },
  {
    question: 'Can I analyze both offense and defense?',
    answer: 'Yes! AI Scout detects and analyzes all players visible on the field, including both teams. You can mark which team is yours to get tailored insights.',
  },
  {
    question: 'Do you support multiple sports?',
    answer: 'We currently support Football (American) and Basketball. We auto-detect the sport from your video, or you can specify it manually.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time from your dashboard. You\'ll continue to have access until the end of your billing period.',
  },
];

const testimonials = [
  {
    quote: "AI Scout has transformed how we prepare for games. Getting scouting reports on every player automatically saves us hours of film study.",
    author: "Coach Thompson",
    role: "Head Football Coach, Lincoln High",
  },
  {
    quote: "The player tracking is incredibly accurate. We can now identify tendencies we never noticed before.",
    author: "Sarah Martinez",
    role: "Assistant Basketball Coach, Eastside Academy",
  },
  {
    quote: "Worth every penny. Our assistant coaches can now focus on coaching instead of spending nights breaking down film.",
    author: "Mike Johnson",
    role: "Athletic Director, Westfield High",
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
            AI-Powered Scouting for Every Budget
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Upload game film, get detailed scouting reports. All plans include a 14-day free trial.
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

                <div className="mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    ${billingInterval === 'year' ? Math.floor(plan.price * 0.8) : plan.price}
                  </span>
                  <span className="text-gray-500 ml-1">/{billingInterval}</span>
                </div>

                <div className="mb-6 text-sm text-gray-500">
                  {plan.gamesPerMonth === -1 ? (
                    <span className="flex items-center gap-1">
                      <Video className="w-4 h-4" />
                      Unlimited games
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Video className="w-4 h-4" />
                      {plan.gamesPerMonth} games/month
                    </span>
                  )}
                </div>

                <Link
                  href={plan.name === 'Team' ? '/contact' : `/sign-up?priceId=${plan.priceId}`}
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

      {/* What's Included */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            What's included in every plan
          </h2>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#0f2d52]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Video className="w-6 h-6 text-[#0f2d52]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Video Analysis</h3>
              <p className="text-sm text-gray-600">Upload any game film and get AI-powered analysis</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#0f2d52]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-[#0f2d52]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Player Tracking</h3>
              <p className="text-sm text-gray-600">Automatic jersey number detection and tracking</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#0f2d52]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-[#0f2d52]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Scouting Reports</h3>
              <p className="text-sm text-gray-600">Detailed reports with grades and tendencies</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#0f2d52]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-[#0f2d52]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Play Markers</h3>
              <p className="text-sm text-gray-600">Jump to any play or key moment instantly</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Trusted by coaches everywhere
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
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
            Ready to scout smarter?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Start your 14-day free trial today. No credit card required.
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
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Talk to sales
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
