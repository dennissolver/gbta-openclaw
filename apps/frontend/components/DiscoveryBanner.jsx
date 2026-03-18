import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const TIPS = [
  {
    id: 'tip-email',
    text: 'Did you know? OpenClaw can process your entire email inbox automatically. Try creating an Email Management project.',
  },
  {
    id: 'tip-schedule',
    text: 'Tip: You can schedule daily briefings that run every morning. Ask your agent to set one up.',
  },
  {
    id: 'tip-memory',
    text: "Your agent has persistent memory. Try saying 'Remember that my team uses Slack for communication'.",
  },
  {
    id: 'tip-templates',
    text: "You've only explored a fraction of the project templates. Discover more in the Projects dashboard.",
  },
  {
    id: 'tip-whatsapp',
    text: 'Pro tip: Connect your WhatsApp to get AI responses on your phone.',
  },
  {
    id: 'tip-code',
    text: 'Have you tried asking your agent to write and run code? It can execute commands on your behalf.',
  },
  {
    id: 'tip-browse',
    text: "Your agent can browse the web and summarize articles. Try 'Summarize this URL: [paste link]'.",
  },
  {
    id: 'tip-recurring',
    text: "Schedule recurring tasks: 'Every Friday at 4pm, generate a weekly status report'.",
  },
];

const STORAGE_KEY = 'openclaw-dismissed-tips';
const SESSION_KEY = 'openclaw-banner-shown-this-session';

export default function DiscoveryBanner() {
  const [currentTip, setCurrentTip] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show one tip per session
    if (typeof window === 'undefined') return;
    const shownThisSession = sessionStorage.getItem(SESSION_KEY);
    if (shownThisSession) return;

    const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const available = TIPS.filter((t) => !dismissed.includes(t.id));
    if (available.length === 0) return;

    // Pick a random tip from available
    const tip = available[Math.floor(Math.random() * available.length)];
    setCurrentTip(tip);
    setVisible(true);
    sessionStorage.setItem(SESSION_KEY, 'true');
  }, []);

  const dismiss = () => {
    if (!currentTip) return;
    const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    dismissed.push(currentTip.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
    setVisible(false);
  };

  if (!visible || !currentTip) return null;

  return (
    <div className="relative bg-gradient-to-r from-brand-500/5 via-brand-500/10 to-brand-500/5 border border-brand-500/20 rounded-xl px-5 py-4 mb-4">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-brand-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-dark-200 leading-relaxed">{currentTip.text}</p>
          <p className="text-xs text-dark-500 mt-1">
            Are you getting the most from OpenClaw?
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/discover"
          className="flex-shrink-0 text-sm font-medium px-4 py-1.5 rounded-lg bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 border border-brand-500/30 transition-colors"
        >
          Start Discovery Session
        </Link>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-dark-500 hover:text-dark-300 transition-colors p-1"
          title="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
