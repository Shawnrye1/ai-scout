'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail, MapPin, Phone, MessageSquare, Clock, ArrowRight } from 'lucide-react';

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
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium text-[#0f2d52] transition-colors">
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

const contactMethods = [
  {
    icon: Mail,
    title: 'Email',
    description: 'Our team typically responds within 2 hours',
    value: 'support@saasbase.com',
    href: 'mailto:support@saasbase.com',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Available Mon-Fri, 9am-6pm EST',
    value: 'Start a conversation',
    href: '#',
  },
  {
    icon: Phone,
    title: 'Phone',
    description: 'For enterprise customers',
    value: '+1 (555) 123-4567',
    href: 'tel:+15551234567',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitted(true);
    setIsSubmitting(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero */}
      <section className="pt-16 pb-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Get in touch
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have a question or need help? We'd love to hear from you.
            Our team is here to help.
          </p>
        </div>
      </section>

      {/* Contact methods */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {contactMethods.map((method, i) => (
              <a
                key={i}
                href={method.href}
                className="p-6 bg-white rounded-xl border border-gray-200 hover:border-[#0f2d52] hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-[#0f2d52]/10 flex items-center justify-center mb-4">
                  <method.icon className="h-6 w-6 text-[#0f2d52]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {method.title}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{method.description}</p>
                <p className="text-sm font-medium text-[#0f2d52]">{method.value}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Send us a message
            </h2>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Message sent!
                </h3>
                <p className="text-gray-600 mb-6">
                  Thanks for reaching out. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', subject: '', message: '' });
                  }}
                  className="text-[#0f2d52] font-medium hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0f2d52] focus:border-transparent outline-none transition-all"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0f2d52] focus:border-transparent outline-none transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0f2d52] focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Select a topic</option>
                    <option value="sales">Sales inquiry</option>
                    <option value="support">Technical support</option>
                    <option value="billing">Billing question</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0f2d52] focus:border-transparent outline-none transition-all resize-none"
                    placeholder="How can we help?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-lg bg-[#0f2d52] text-white font-semibold hover:bg-[#1a4a7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Office info */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Our Office</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-[#0f2d52]" />
                <span className="text-gray-600">San Francisco, CA</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-[#0f2d52]" />
                <span className="text-gray-600">Mon-Fri, 9am-6pm PST</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
