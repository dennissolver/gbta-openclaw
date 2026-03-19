import React from 'react';
import Link from 'next/link';

const INTEGRATIONS = [
  {
    id: 'ghl',
    name: 'Go High Level',
    desc: 'CRM integration — sync contacts, capture leads, trigger workflows',
    icon: '🔗',
    color: 'border-blue-500/30 bg-blue-500/5',
    badge: 'Available',
    badgeColor: 'badge-green',
    href: '/integrations/ghl',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Send and receive messages through your WhatsApp account',
    icon: '💬',
    color: 'border-green-500/30 bg-green-500/5',
    badge: 'Coming Soon',
    badgeColor: 'badge-orange',
    href: null,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    desc: 'Connect a Telegram bot for messaging and notifications',
    icon: '✈️',
    color: 'border-blue-400/30 bg-blue-400/5',
    badge: 'Coming Soon',
    badgeColor: 'badge-orange',
    href: null,
  },
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Integrate with your Slack workspace for team communication',
    icon: '💼',
    color: 'border-purple-500/30 bg-purple-500/5',
    badge: 'Coming Soon',
    badgeColor: 'badge-orange',
    href: null,
  },
  {
    id: 'gmail',
    name: 'Gmail / Email',
    desc: 'Process, organize, and auto-reply to emails via IMAP/SMTP',
    icon: '📧',
    color: 'border-red-500/30 bg-red-500/5',
    badge: 'Coming Soon',
    badgeColor: 'badge-orange',
    href: null,
  },
  {
    id: 'github',
    name: 'GitHub',
    desc: 'Review PRs, manage issues, trigger CI/CD workflows',
    icon: '🐙',
    color: 'border-dark-400/30 bg-dark-400/5',
    badge: 'Coming Soon',
    badgeColor: 'badge-orange',
    href: null,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    desc: 'Payment processing, invoice generation, subscription management',
    icon: '💳',
    color: 'border-indigo-500/30 bg-indigo-500/5',
    badge: 'Coming Soon',
    badgeColor: 'badge-orange',
    href: null,
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    desc: 'Manage events, check availability, send meeting invites',
    icon: '📅',
    color: 'border-yellow-500/30 bg-yellow-500/5',
    badge: 'Coming Soon',
    badgeColor: 'badge-orange',
    href: null,
  },
];

export default function Integrations() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Integrations</h1>
        <p className="text-dark-300 text-lg max-w-2xl mx-auto">
          Connect EasyOpenClaw to your favourite tools and platforms. Configure integrations to extend your agent's capabilities.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map(int => {
          const Card = (
            <div key={int.id} className={`card-hover border-2 ${int.color} ${int.href ? 'cursor-pointer' : 'opacity-70'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{int.icon}</span>
                  <h3 className="text-white font-semibold text-lg">{int.name}</h3>
                </div>
                <span className={int.badgeColor}>{int.badge}</span>
              </div>
              <p className="text-dark-400 text-sm">{int.desc}</p>
              {int.href && (
                <div className="mt-4">
                  <span className="text-brand-400 text-sm font-medium">Configure →</span>
                </div>
              )}
            </div>
          );

          if (int.href) {
            return <Link key={int.id} href={int.href} className="block">{Card}</Link>;
          }
          return <div key={int.id}>{Card}</div>;
        })}
      </div>
    </div>
  );
}
