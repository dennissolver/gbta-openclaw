import React, { useState } from 'react';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'automation', label: 'Automation' },
  { id: 'memory', label: 'Memory & Context' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'security', label: 'Security' },
];

const FEATURES = [
  {
    category: 'messaging',
    title: 'WhatsApp Integration',
    desc: 'Send and receive messages, manage groups, share files — all through your existing WhatsApp account. Your agent becomes a contact you can message anytime.',
    status: 'Available',
  },
  {
    category: 'messaging',
    title: 'Telegram Bot',
    desc: 'Full Telegram bot integration with inline keyboards, file handling, and group management. Supports both private and group conversations.',
    status: 'Available',
  },
  {
    category: 'messaging',
    title: 'Slack & Teams',
    desc: 'Enterprise messaging integration. Your agent joins channels, responds to mentions, runs slash commands, and posts updates automatically.',
    status: 'Available',
  },
  {
    category: 'messaging',
    title: 'Discord',
    desc: 'Full Discord bot with slash commands, thread management, reactions, and voice channel awareness.',
    status: 'Available',
  },
  {
    category: 'messaging',
    title: 'Signal & iMessage',
    desc: 'Privacy-focused messaging support. End-to-end encrypted communication with your AI agent.',
    status: 'Available',
  },
  {
    category: 'messaging',
    title: 'Email (IMAP/SMTP)',
    desc: 'Process incoming emails, draft responses, organize folders, and send emails on your behalf with full HTML support.',
    status: 'Available',
  },
  {
    category: 'automation',
    title: 'Shell Command Execution',
    desc: 'Run any command on your server — deploy code, manage infrastructure, query databases, process files. Full terminal access with safety guardrails.',
    status: 'Available',
  },
  {
    category: 'automation',
    title: 'Browser Automation',
    desc: 'Navigate websites, fill forms, scrape data, take screenshots. Headless Chrome/Playwright integration for web tasks.',
    status: 'Available',
  },
  {
    category: 'automation',
    title: 'Proactive Cron Jobs',
    desc: 'Schedule recurring tasks — daily briefings, health checks, data syncs, report generation. Your agent acts without being asked.',
    status: 'Available',
  },
  {
    category: 'automation',
    title: 'File Operations',
    desc: 'Read, write, move, compress, and process files. Handle PDFs, spreadsheets, images, and structured data formats.',
    status: 'Available',
  },
  {
    category: 'automation',
    title: 'Calendar Management',
    desc: 'Create events, check availability, send invites, and manage your schedule across Google Calendar, Outlook, and CalDAV.',
    status: 'Available',
  },
  {
    category: 'automation',
    title: 'Workflow Pipelines',
    desc: 'Chain multiple skills together into multi-step workflows. Trigger on events, branch on conditions, loop until complete.',
    status: 'Available',
  },
  {
    category: 'memory',
    title: 'Persistent Memory',
    desc: 'Your agent remembers everything across sessions — preferences, projects, contacts, decisions. No more repeating context.',
    status: 'Available',
  },
  {
    category: 'memory',
    title: 'Knowledge Base',
    desc: 'Feed documents, wikis, and reference material. Your agent indexes and retrieves relevant knowledge when answering questions.',
    status: 'Available',
  },
  {
    category: 'memory',
    title: 'Conversation History',
    desc: 'Full searchable history across all messaging platforms. Find that thing you discussed three weeks ago on Telegram.',
    status: 'Available',
  },
  {
    category: 'memory',
    title: 'Adaptive Learning',
    desc: 'Your agent learns your communication style, preferred tools, and decision patterns over time. It gets better the more you use it.',
    status: 'Available',
  },
  {
    category: 'integrations',
    title: 'MCP Protocol (13,000+ Services)',
    desc: 'Full Model Context Protocol support. Connect to any MCP-compatible service — the open standard adopted by Anthropic, OpenAI, Google, and the Linux Foundation.',
    status: 'Available',
  },
  {
    category: 'integrations',
    title: 'ClawHub Skills (5,400+)',
    desc: 'Browse and install pre-built skills from the community marketplace. One command to add new capabilities to your agent.',
    status: 'Available',
  },
  {
    category: 'integrations',
    title: 'GitHub / GitLab',
    desc: 'Review PRs, create issues, manage branches, trigger CI/CD, and merge code — all from your messaging app.',
    status: 'Available',
  },
  {
    category: 'integrations',
    title: 'Jira / Linear / Todoist',
    desc: 'Create tickets, update statuses, assign tasks, and sync project management tools with your conversations.',
    status: 'Available',
  },
  {
    category: 'integrations',
    title: 'LLM-Agnostic',
    desc: 'Choose your AI backend — Claude, GPT-4, DeepSeek, Llama, Mistral, or any local model. Switch anytime without losing data.',
    status: 'Available',
  },
  {
    category: 'integrations',
    title: 'Smart Home (HomeAssistant)',
    desc: 'Control lights, thermostats, locks, cameras, and any HomeAssistant-compatible device through natural language.',
    status: 'Available',
  },
  {
    category: 'security',
    title: 'Self-Hosted',
    desc: 'Runs entirely on your infrastructure. No data leaves your machine unless you explicitly configure external services.',
    status: 'Available',
  },
  {
    category: 'security',
    title: 'Permission System',
    desc: 'Granular control over what your agent can and cannot do. Require confirmation for sensitive actions like sending emails or running commands.',
    status: 'Available',
  },
  {
    category: 'security',
    title: 'Audit Logging',
    desc: 'Every action your agent takes is logged with full context — who triggered it, what was done, and when. Complete traceability.',
    status: 'Available',
  },
  {
    category: 'security',
    title: 'Encrypted Storage',
    desc: 'Credentials, API keys, and sensitive data are encrypted at rest. Secrets never appear in logs or conversation history.',
    status: 'Available',
  },
];

export default function Features() {
  const [active, setActive] = useState('all');

  const filtered = active === 'all' ? FEATURES : FEATURES.filter(f => f.category === active);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Full Feature Set</h1>
        <p className="text-dark-300 text-lg max-w-2xl mx-auto">
          Everything OpenClaw can do — from messaging to automation to memory.
          All included in your GBTA deployment.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActive(cat.id)}
            className={active === cat.id ? 'nav-link-active text-sm' : 'nav-link text-sm'}
          >
            {cat.label}
            {cat.id !== 'all' && (
              <span className="ml-1.5 text-dark-500 text-xs">
                ({FEATURES.filter(f => f.category === cat.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feature grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((f, i) => (
          <div key={i} className="card-hover">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-white font-medium">{f.title}</h3>
              <span className="badge-green text-xs flex-shrink-0 ml-2">{f.status}</span>
            </div>
            <p className="text-dark-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
        {[
          { value: '250k+', label: 'GitHub Stars' },
          { value: '5,400+', label: 'Skills Available' },
          { value: '13,000+', label: 'MCP Integrations' },
          { value: '15+', label: 'Messaging Platforms' },
        ].map((s, i) => (
          <div key={i} className="card text-center">
            <div className="text-2xl font-bold text-brand-400 mb-1">{s.value}</div>
            <div className="text-dark-400 text-sm">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
