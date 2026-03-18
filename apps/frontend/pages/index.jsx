import React from 'react';
import Link from 'next/link';

const HIGHLIGHTS = [
  {
    icon: '🤖',
    title: 'Autonomous AI Agent',
    desc: 'A self-hosted AI agent that runs on your infrastructure. It doesn\'t just answer questions — it executes tasks, manages workflows, and takes action on your behalf.',
  },
  {
    icon: '💬',
    title: 'Multi-Platform Messaging',
    desc: 'Connect through WhatsApp, Telegram, Slack, Discord, Teams, Signal, and 15+ messaging platforms. Control your agent from wherever you already work.',
  },
  {
    icon: '🧠',
    title: 'Persistent Memory',
    desc: 'Your agent remembers context across sessions. It learns your preferences, tracks ongoing projects, and builds knowledge over time.',
  },
  {
    icon: '🔧',
    title: '5,400+ Skills via ClawHub',
    desc: 'Install pre-built skills for email management, calendar automation, code review, data analysis, smart home control, and thousands more.',
  },
  {
    icon: '🔌',
    title: '13,000+ MCP Integrations',
    desc: 'Full Model Context Protocol support. Connect to any MCP-compatible service — from GitHub to Jira to your custom internal tools.',
  },
  {
    icon: '🔒',
    title: 'Self-Hosted & Private',
    desc: 'Your data stays on your machine. No SaaS middleman, no data sharing. Choose your own LLM backend — Claude, GPT, DeepSeek, or local models.',
  },
];

const USE_CASES = [
  { label: 'Email Management', desc: 'Process, organize, and respond to emails automatically', badge: 'Popular', color: 'badge-green' },
  { label: 'Code Review & DevOps', desc: 'Review PRs, run tests, merge code from your phone', badge: 'Dev', color: 'badge-blue' },
  { label: 'Meeting Summaries', desc: 'Turn transcripts into structured notes and action items', badge: 'Business', color: 'badge-purple' },
  { label: 'Daily Briefings', desc: 'Personalized morning digest — weather, calendar, tasks, news', badge: 'Personal', color: 'badge-orange' },
  { label: 'Smart Home', desc: 'Control devices, adjust heating, trigger automations via chat', badge: 'IoT', color: 'badge-green' },
  { label: 'Content & Marketing', desc: 'Draft posts, schedule publishing, manage social platforms', badge: 'Marketing', color: 'badge-purple' },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="badge-green mb-6 inline-flex">
              Powered by OpenClaw — 250k+ GitHub Stars
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Your Autonomous AI Agent,{' '}
              <span className="text-brand-400">Customized by GBTA</span>
            </h1>
            <p className="text-lg sm:text-xl text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              A self-hosted AI agent that connects to your messaging apps, executes real tasks,
              and remembers everything — configured and managed by Global Buildtech Australia
              for Australian businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/workspace" className="btn-primary text-lg px-8 py-3">
                Launch Your Agent
              </Link>
              <Link href="/features" className="btn-secondary text-lg px-8 py-3">
                Explore Features
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What is OpenClaw */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">What is OpenClaw?</h2>
          <div className="space-y-4 text-dark-300 leading-relaxed">
            <p>
              <strong className="text-white">OpenClaw</strong> is the world's most popular open-source autonomous AI agent —
              a self-hosted personal AI assistant that runs on your own machine. Unlike traditional chatbots,
              OpenClaw doesn't just answer questions — it <strong className="text-brand-400">takes action</strong>.
            </p>
            <p>
              It connects through the chat apps you already use (WhatsApp, Slack, Telegram, Teams, and more),
              executes shell commands, manages emails, automates workflows, controls smart devices, and
              maintains persistent memory across all your conversations.
            </p>
            <p>
              <strong className="text-white">GBTA's customized deployment</strong> gives you a pre-configured,
              production-ready OpenClaw instance tailored for Australian business needs — with curated skills,
              optimized LLM routing, and enterprise-grade security.
            </p>
          </div>
        </div>
      </section>

      {/* Why We Built This */}
      <section className="border-y border-dark-800 bg-dark-900/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why GBTA Customized OpenClaw</h2>
            <p className="text-dark-300 text-lg">
              We saw Australian businesses struggling with fragmented AI tools that couldn't take real action.
              OpenClaw solves this — and we've made it turnkey.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card text-center">
              <div className="text-3xl mb-3">🇦🇺</div>
              <h3 className="text-white font-semibold mb-2">AU-Optimized</h3>
              <p className="text-dark-400 text-sm">Pre-configured for Australian time zones, compliance, and business workflows</p>
            </div>
            <div className="card text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-white font-semibold mb-2">Zero Setup</h3>
              <p className="text-dark-400 text-sm">Skip the hours of configuration. We've curated the best skills and integrations for you</p>
            </div>
            <div className="card text-center">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="text-white font-semibold mb-2">Enterprise Ready</h3>
              <p className="text-dark-400 text-sm">Managed deployment with support, monitoring, and security built in from day one</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Core Capabilities</h2>
          <p className="text-dark-300 text-lg max-w-2xl mx-auto">
            Everything you need in an AI agent — messaging, memory, skills, and real-world action.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className="card-hover">
              <div className="text-3xl mb-4">{h.icon}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{h.title}</h3>
              <p className="text-dark-400 text-sm leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/features" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            View all features →
          </Link>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t border-dark-800 bg-dark-900/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">What People Use It For</h2>
            <p className="text-dark-300 text-lg">Real use cases from 250,000+ OpenClaw users worldwide</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {USE_CASES.map((uc, i) => (
              <div key={i} className="card-hover flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium">{uc.label}</h3>
                  <span className={uc.color}>{uc.badge}</span>
                </div>
                <p className="text-dark-400 text-sm">{uc.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/templates" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Browse preset templates →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="card text-center bg-gradient-to-br from-dark-900 to-dark-800 border-brand-500/20">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-dark-300 text-lg mb-8 max-w-xl mx-auto">
            Launch your GBTA-configured OpenClaw agent in minutes. Pre-loaded with curated skills and templates.
          </p>
          <Link href="/workspace" className="btn-primary text-lg px-10 py-3">
            Launch Your Agent
          </Link>
        </div>
      </section>
    </div>
  );
}
