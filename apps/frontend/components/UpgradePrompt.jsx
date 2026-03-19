import React from 'react';
import Link from 'next/link';

export default function UpgradePrompt({ usage, onClose }) {
  const { used, limit, tier } = usage || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card max-w-lg w-full mx-4 relative bg-dark-900 border border-dark-700 shadow-2xl">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-dark-500 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">
            {used >= limit ? "You've reached your monthly limit" : "You're running low on messages"}
          </h2>
          <p className="text-dark-400 text-sm mt-2">
            You've used <span className="text-white font-medium">{used}</span> of{' '}
            <span className="text-white font-medium">{limit}</span> free messages this month.
          </p>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Free */}
          <div className="p-4 rounded-xl border border-dark-700 bg-dark-800/50">
            <div className="text-sm font-semibold text-dark-400 mb-2">Free</div>
            <ul className="space-y-1.5 text-xs text-dark-500">
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-dark-600" />
                50 messages/month
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-dark-600" />
                1 project workspace
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-dark-600" />
                Basic AI model
              </li>
            </ul>
          </div>

          {/* Pro */}
          <div className="p-4 rounded-xl border-2 border-brand-500/50 bg-brand-500/5">
            <div className="text-sm font-semibold text-brand-400 mb-2">Pro</div>
            <ul className="space-y-1.5 text-xs text-dark-300">
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-500" />
                500 messages/month
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-500" />
                Unlimited projects
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-500" />
                Balanced AI model (Sonnet)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-500" />
                Voice discovery coach
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-500" />
                Full persistent memory
              </li>
            </ul>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/pricing"
            className="btn-primary w-full text-center py-3 text-lg"
          >
            Upgrade to Pro &mdash; $39/mo
          </Link>
          <Link
            href="/onboarding?plan=pro"
            className="btn-secondary w-full text-center py-2.5"
          >
            Start Free Trial
          </Link>
        </div>

        <p className="text-center text-dark-500 text-xs mt-4">
          No credit card required for trial &middot; Cancel anytime
        </p>
      </div>
    </div>
  );
}
