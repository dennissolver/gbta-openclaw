import React, { useState } from 'react';
import Link from 'next/link';
import PricingCard from '../components/PricingCard';

/* ------------------------------------------------------------------ */
/*  Tier data                                                         */
/* ------------------------------------------------------------------ */

const TIERS = [
  {
    name: 'Free',
    price: 0,
    period: 'month',
    description:
      'Get started with AI-powered automation. Perfect for exploring what EasyOpenClaw can do.',
    cta: 'Get Started',
    ctaHref: '/onboarding',
    features: [
      { label: '50 AI messages per month' },
      { label: '1 project workspace' },
      { label: 'Basic AI model (Fast tier)' },
      { label: 'Text-based discovery coach' },
      { label: 'Session tips & guided templates' },
      { label: 'Community support' },
      { label: 'Basic memory (7-day retention)' },
    ],
  },
  {
    name: 'Pro',
    price: 39,
    period: 'month',
    description:
      'For professionals who need more power, voice coaching, and persistent memory.',
    cta: 'Start Pro Trial',
    ctaHref: '/onboarding?plan=pro',
    badge: 'Most Popular',
    features: [
      { label: '500 AI messages per month' },
      { label: 'Unlimited project workspaces' },
      { label: 'Balanced AI model (Sonnet-class)' },
      { label: 'Voice discovery coach (ElevenLabs)' },
      { label: 'Full persistent memory' },
      { label: 'All 17 preset templates' },
      { label: 'File workspace access' },
      { label: 'Achievement tracking' },
      { label: 'Email support' },
    ],
  },
  {
    name: 'Business',
    price: 99,
    period: 'month',
    accent: 'purple',
    description:
      'Unlimited power for teams and enterprises. Dedicated instance, premium models, priority everything.',
    cta: 'Contact Sales',
    ctaMailto: 'mailto:dennis@globalbuildtech.com.au',
    features: [
      { label: 'Unlimited AI messages' },
      { label: 'Unlimited projects + team collaboration', soon: true },
      { label: 'Premium AI model (Opus-class)' },
      { label: 'Voice discovery coach (unlimited)' },
      { label: 'Full persistent memory + knowledge base' },
      { label: 'All channels (WhatsApp, Telegram, Slack, Email)', soon: true },
      { label: 'Dedicated agent instance' },
      { label: 'Priority model routing' },
      { label: 'Custom instructions library' },
      { label: 'Weekly automation reports' },
      { label: 'Priority support' },
      { label: 'API access', soon: true },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: 'What counts as a message?',
    a: 'Each message you send to the AI agent counts as one message. Agent responses don\'t count.',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes, changes take effect immediately. Unused messages don\'t roll over.',
  },
  {
    q: 'What AI models are used?',
    a: 'Free uses fast models (Haiku-class). Pro uses balanced models (Sonnet-class). Business uses premium models (Opus-class) with automatic routing.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Each user gets an isolated agent instance. Your data stays on Australian infrastructure and is never shared.',
  },
  {
    q: 'What\'s the voice discovery coach?',
    a: 'An AI voice assistant that interviews you about your workflow and recommends automations. Available on Pro and Business plans.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. EasyOpenClaw runs in the cloud. You access everything through your browser.',
  },
];

/* ------------------------------------------------------------------ */
/*  Comparison table data                                             */
/* ------------------------------------------------------------------ */

const COMPARISON = [
  { feature: 'AI messages / month', free: '50', pro: '500', business: 'Unlimited' },
  { feature: 'Project workspaces', free: '1', pro: 'Unlimited', business: 'Unlimited' },
  { feature: 'AI model tier', free: 'Fast (Haiku)', pro: 'Balanced (Sonnet)', business: 'Premium (Opus)' },
  { feature: 'Discovery coach', free: 'Text only', pro: 'Text + Voice', business: 'Text + Voice (unlimited)' },
  { feature: 'Memory retention', free: '7 days', pro: 'Persistent', business: 'Persistent + knowledge base' },
  { feature: 'Preset templates', free: 'Guided tips', pro: 'All 17', business: 'All 17 + custom library' },
  { feature: 'File workspace', free: '\u2014', pro: '\u2713', business: '\u2713' },
  { feature: 'Achievement tracking', free: '\u2014', pro: '\u2713', business: '\u2713' },
  { feature: 'Team collaboration', free: '\u2014', pro: '\u2014', business: 'Coming soon' },
  { feature: 'Dedicated instance', free: '\u2014', pro: '\u2014', business: '\u2713' },
  { feature: 'Priority model routing', free: '\u2014', pro: '\u2014', business: '\u2713' },
  { feature: 'Multi-channel messaging', free: '\u2014', pro: '\u2014', business: 'Coming soon' },
  { feature: 'Weekly reports', free: '\u2014', pro: '\u2014', business: '\u2713' },
  { feature: 'API access', free: '\u2014', pro: '\u2014', business: 'Coming soon' },
  { feature: 'Support', free: 'Community', pro: 'Email', business: 'Priority' },
];

/* ------------------------------------------------------------------ */
/*  FAQ Accordion Item                                                */
/* ------------------------------------------------------------------ */

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-dark-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-dark-800/50 transition-colors"
      >
        <span className="text-white font-medium pr-4">{faq.q}</span>
        <svg
          className={`w-5 h-5 text-dark-400 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-4 text-dark-300 text-sm leading-relaxed">
          {faq.a}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison cell helper                                            */
/* ------------------------------------------------------------------ */

function ComparisonCell({ value }) {
  if (value === '\u2713') {
    return (
      <svg className="w-5 h-5 text-brand-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (value === '\u2014') {
    return <span className="text-dark-600">&mdash;</span>;
  }
  return <span className="text-dark-300 text-sm">{value}</span>;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function Pricing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="badge-green mb-6 inline-flex">
              Australian Infrastructure &middot; Powered by OpenClaw
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-lg sm:text-xl text-dark-300 max-w-2xl mx-auto leading-relaxed">
              Start free. Upgrade when you need more power. No hidden fees, no lock-in contracts.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
          {TIERS.map((tier, i) => (
            <PricingCard key={tier.name} tier={tier} highlighted={i === 1} />
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-wrap justify-center gap-8 text-dark-400 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>SOC 2 compliant infrastructure</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Australian data residency (Sydney)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Encrypted at rest &amp; in transit</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>EasyOpenClaw &mdash; Powered by OpenClaw</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-dark-800 bg-dark-900/50 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-dark-300 text-lg">
              Everything you need to know about EasyOpenClaw pricing.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} faq={faq} />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Compare Plans</h2>
          <p className="text-dark-300 text-lg">
            A detailed look at what each tier includes.
          </p>
        </div>
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0">
              <tr className="border-b border-dark-700 bg-dark-950">
                <th className="py-4 px-4 text-dark-400 text-sm font-medium w-1/3">Feature</th>
                <th className="py-4 px-4 text-white text-sm font-semibold text-center">Free</th>
                <th className="py-4 px-4 text-brand-400 text-sm font-semibold text-center">Pro</th>
                <th className="py-4 px-4 text-purple-400 text-sm font-semibold text-center">Business</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-dark-800 ${
                    i % 2 === 0 ? 'bg-dark-900/30' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-dark-300 text-sm">{row.feature}</td>
                  <td className="py-3 px-4 text-center">
                    <ComparisonCell value={row.free} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <ComparisonCell value={row.pro} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <ComparisonCell value={row.business} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="card text-center bg-gradient-to-br from-dark-900 to-dark-800 border-brand-500/20">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-dark-300 text-lg mb-8 max-w-xl mx-auto">
            Launch your AI agent in minutes. Start free, upgrade anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding" className="btn-primary text-lg px-10 py-3">
              Start Free
            </Link>
            <a
              href="mailto:dennis@globalbuildtech.com.au"
              className="btn-secondary text-lg px-10 py-3"
            >
              Talk to Sales
            </a>
          </div>
          <p className="text-dark-500 text-sm mt-6">
            No credit card required &middot; Starting at $0/month &middot; Australian infrastructure
          </p>
        </div>
      </section>
    </div>
  );
}
