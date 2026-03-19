import React, { useState } from 'react';
import Link from 'next/link';

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Dedicated AI Agents',
    description: 'Each team gets a dedicated agent instance with custom training, instructions, and priority model routing.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Team Collaboration',
    description: 'Shared workspaces, project templates, and knowledge bases across your entire organization.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Priority Support & SLA',
    description: 'Dedicated account manager, priority model routing, 99.9% uptime SLA, and <1hr response time.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
    title: 'Custom Integrations',
    description: 'Connect to your existing tools — Slack, Teams, CRM, project management, and custom APIs.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Enterprise Security',
    description: 'SSO (coming soon), audit logs, data residency controls, and SOC 2 compliant Australian infrastructure.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Analytics & Reporting',
    description: 'Weekly automation reports, usage analytics, ROI tracking, and team productivity dashboards.',
  },
];

const TEAM_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

export default function Enterprise() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // ROI calculator state
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [teamMembers, setTeamMembers] = useState(5);
  const hourlyRate = 75; // AUD
  const automationRate = 0.6; // 60% of repetitive tasks can be automated
  const weeklySavings = hoursPerWeek * teamMembers * hourlyRate * automationRate;
  const annualSavings = weeklySavings * 48; // 48 working weeks

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const resp = await fetch('/api/enterprise-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (resp.ok) {
        setSubmitted(true);
      } else {
        const data = await resp.json().catch(() => ({}));
        setError(data.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="badge-purple mb-6 inline-flex">Enterprise Solutions</div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              EasyOpenClaw for
              <br />
              <span className="text-purple-400">Teams & Enterprise</span>
            </h1>
            <p className="text-lg sm:text-xl text-dark-300 max-w-2xl mx-auto leading-relaxed mb-8">
              Dedicated AI agents, team collaboration, enterprise security, and
              custom integrations. Built on Australian infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#contact" className="btn-primary text-lg px-10 py-3">
                Talk to Sales
              </a>
              <Link href="/pricing" className="btn-secondary text-lg px-10 py-3">
                Compare Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Enterprise-Grade Features</h2>
          <p className="text-dark-300 text-lg max-w-2xl mx-auto">
            Everything your team needs to automate at scale.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="card-hover group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-500/20 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-dark-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Customer Logos (Placeholder) */}
      <section className="border-y border-dark-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-dark-500 text-sm uppercase tracking-wide mb-8">
            Trusted by forward-thinking Australian businesses
          </p>
          <div className="flex flex-wrap justify-center gap-12 opacity-40">
            {['Company A', 'Company B', 'Company C', 'Company D', 'Company E'].map(
              (name) => (
                <div
                  key={name}
                  className="w-32 h-12 rounded-lg bg-dark-800 flex items-center justify-center"
                >
                  <span className="text-dark-500 text-xs font-medium">{name}</span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">ROI Calculator</h2>
            <p className="text-dark-300 text-lg">
              See how much your team could save with AI-powered automation.
            </p>
          </div>

          <div className="card bg-dark-900 border-purple-500/20">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm text-dark-300 mb-2">
                  Hours per week on repetitive tasks (per person)
                </label>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="text-right text-sm text-purple-400 font-medium mt-1">
                  {hoursPerWeek} hours/week
                </div>
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Team members</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={teamMembers}
                  onChange={(e) => setTeamMembers(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="text-right text-sm text-purple-400 font-medium mt-1">
                  {teamMembers} people
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-6 bg-dark-800/50 rounded-xl border border-dark-700">
              <div className="text-center">
                <div className="text-sm text-dark-400 mb-1">Weekly Savings</div>
                <div className="text-2xl font-bold text-white">
                  ${weeklySavings.toLocaleString()}
                </div>
                <div className="text-xs text-dark-500">AUD</div>
              </div>
              <div className="text-center border-x border-dark-700">
                <div className="text-sm text-dark-400 mb-1">Annual Savings</div>
                <div className="text-2xl font-bold text-purple-400">
                  ${annualSavings.toLocaleString()}
                </div>
                <div className="text-xs text-dark-500">AUD</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-dark-400 mb-1">Hours Saved/Year</div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(hoursPerWeek * teamMembers * automationRate * 48).toLocaleString()}
                </div>
                <div className="text-xs text-dark-500">hours</div>
              </div>
            </div>

            <p className="text-xs text-dark-500 mt-4 text-center">
              Based on ${hourlyRate}/hr average and {Math.round(automationRate * 100)}% automation
              rate for repetitive tasks.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="border-t border-dark-800 bg-dark-900/50 py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Get in Touch</h2>
            <p className="text-dark-300 text-lg">
              Tell us about your team and we'll get back to you within 24 hours.
            </p>
          </div>

          {submitted ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Thanks for reaching out!</h3>
              <p className="text-dark-400">
                We'll review your inquiry and get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleChange('name')}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">
                    Work Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={handleChange('company')}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Team Size</label>
                  <select
                    value={formData.teamSize}
                    onChange={handleChange('teamSize')}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select...</option>
                    {TEAM_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} people
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1">
                  What are you looking to automate?
                </label>
                <textarea
                  value={formData.message}
                  onChange={handleChange('message')}
                  rows={4}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Tell us about your team's workflow and what tasks you'd like to automate..."
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Contact Sales'}
              </button>

              <p className="text-xs text-dark-500 text-center">
                We'll respond within 24 hours. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
