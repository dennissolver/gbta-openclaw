import React, { useState } from 'react';
import Link from 'next/link';

const TEMPLATES = [
  {
    category: 'Getting Started',
    items: [
      {
        title: 'First-Time Setup',
        desc: 'Connect your first messaging platform and send your first command',
        prompt: 'Help me set up EasyOpenClaw. I want to connect my WhatsApp account and configure basic preferences like my timezone (AEST), name, and notification settings.',
        difficulty: 'Beginner',
        time: '5 min',
      },
      {
        title: 'Daily Briefing',
        desc: 'Get a personalized morning summary delivered to your phone every day',
        prompt: 'Set up a daily briefing that runs at 7am AEST. Include: today\'s weather for Sydney, my calendar events, any unread priority emails, and top 3 news headlines relevant to my industry.',
        difficulty: 'Beginner',
        time: '3 min',
      },
      {
        title: 'Quick Memory Test',
        desc: 'Teach your agent something and verify it remembers',
        prompt: 'Remember that my preferred programming language is Python, my team uses Linear for project management, and our sprint reviews are every second Friday. Now tell me what you know about my workflow.',
        difficulty: 'Beginner',
        time: '1 min',
      },
    ],
  },
  {
    category: 'Email & Communication',
    items: [
      {
        title: 'Inbox Zero',
        desc: 'Process and organize your entire inbox automatically',
        prompt: 'Connect to my email and process unread messages. For each email: (1) categorize as urgent/important/FYI/spam, (2) draft a reply for urgent items, (3) archive newsletters, (4) flag items needing my personal attention. Give me a summary when done.',
        difficulty: 'Intermediate',
        time: '10 min',
      },
      {
        title: 'Meeting Follow-Up',
        desc: 'Turn meeting notes into action items and send follow-ups',
        prompt: 'Here are my meeting notes from today\'s standup: [paste notes]. Extract all action items with owners and deadlines. Create tickets in Linear for each. Draft a follow-up email to attendees with the summary and action items.',
        difficulty: 'Intermediate',
        time: '5 min',
      },
      {
        title: 'Email Template Library',
        desc: 'Create reusable email templates for common scenarios',
        prompt: 'Create a library of email templates I can reuse: (1) Project status update to stakeholders, (2) Meeting scheduling request, (3) Follow-up after a sales call, (4) Polite decline for unsolicited vendor outreach, (5) Introduction/referral email. Store these in memory for quick access.',
        difficulty: 'Beginner',
        time: '5 min',
      },
    ],
  },
  {
    category: 'Development & DevOps',
    items: [
      {
        title: 'PR Review Bot',
        desc: 'Automatically review pull requests and post feedback',
        prompt: 'Set up a GitHub PR review workflow. When a new PR is opened on my repo [repo-name]: (1) Check the diff for obvious issues, (2) Run the test suite, (3) Post a review comment with findings, (4) Notify me on Slack if it needs my attention. Auto-approve if tests pass and diff is < 50 lines.',
        difficulty: 'Advanced',
        time: '15 min',
      },
      {
        title: 'Deploy Monitor',
        desc: 'Watch deployments and alert on failures',
        prompt: 'Monitor my Vercel deployments for [project-name]. When a deploy starts: (1) Notify me on Telegram, (2) If it fails, fetch the build logs and send me a summary of what went wrong, (3) If it succeeds, run a quick health check on the production URL and confirm it\'s responding.',
        difficulty: 'Intermediate',
        time: '5 min',
      },
      {
        title: 'Database Backup Scheduler',
        desc: 'Automated database backups with notifications',
        prompt: 'Set up a cron job that runs daily at 2am AEST to: (1) Dump my Supabase database, (2) Compress and upload to cloud storage, (3) Clean up backups older than 30 days, (4) Send me a Telegram message confirming backup completed with size and duration.',
        difficulty: 'Advanced',
        time: '10 min',
      },
    ],
  },
  {
    category: 'Business & Productivity',
    items: [
      {
        title: 'Client Onboarding',
        desc: 'Automate the new client setup process',
        prompt: 'When I tell you I have a new client, help me: (1) Create a workspace folder with standard templates, (2) Draft a welcome email with next steps, (3) Create a project in Linear with the standard onboarding checklist, (4) Schedule the kickoff meeting, (5) Store client details in memory for future reference.',
        difficulty: 'Intermediate',
        time: '10 min',
      },
      {
        title: 'Invoice Processor',
        desc: 'Extract data from invoices and track payments',
        prompt: 'I\'m going to send you invoice PDFs. For each one: (1) Extract vendor, amount, due date, and line items, (2) Check if it\'s a duplicate, (3) Add to my spending tracker spreadsheet, (4) Remind me 3 days before the due date. Start by processing this invoice: [attach PDF].',
        difficulty: 'Intermediate',
        time: '5 min',
      },
      {
        title: 'Weekly Report Generator',
        desc: 'Auto-generate status reports from your activity',
        prompt: 'Set up a weekly report that compiles every Friday at 4pm AEST: (1) Summarize all completed tasks from Linear this week, (2) List key decisions and outcomes from my meeting notes, (3) Highlight blockers and risks, (4) Generate next week\'s priorities. Email the report to my team.',
        difficulty: 'Intermediate',
        time: '5 min',
      },
    ],
  },
  {
    category: 'Research & Knowledge',
    items: [
      {
        title: 'Competitive Intelligence',
        desc: 'Monitor competitors and market changes',
        prompt: 'Monitor these competitors daily: [list companies]. Check their websites, social media, and news mentions for: (1) New product launches, (2) Pricing changes, (3) Key hires, (4) Funding announcements. Send me a weekly digest every Monday.',
        difficulty: 'Advanced',
        time: '10 min',
      },
      {
        title: 'Document Summarizer',
        desc: 'Feed documents and get instant summaries',
        prompt: 'I\'m going to send you a series of documents. For each one: (1) Generate a 3-sentence executive summary, (2) Extract key facts and figures, (3) List action items if any, (4) Store the summary in my knowledge base tagged by topic. Start with this document: [attach file].',
        difficulty: 'Beginner',
        time: '3 min',
      },
      {
        title: 'Learning Assistant',
        desc: 'Structured learning path for any topic',
        prompt: 'I want to learn [topic]. Create a structured 4-week learning plan with: (1) Daily reading/video recommendations (30 min/day), (2) Weekly hands-on exercises, (3) Key concepts to master each week, (4) A progress quiz at the end of each week. Send me daily reminders with the day\'s material.',
        difficulty: 'Beginner',
        time: '5 min',
      },
    ],
  },
  {
    category: 'Smart Home & IoT',
    items: [
      {
        title: 'Morning Routine',
        desc: 'Automate your morning with smart device triggers',
        prompt: 'Create a morning routine that triggers at 6:30am: (1) Turn on the kitchen lights to 70%, (2) Start the coffee machine, (3) Set living room thermostat to 22°C, (4) Play my morning playlist on the living room speaker, (5) Read me today\'s briefing through the speaker.',
        difficulty: 'Intermediate',
        time: '5 min',
      },
      {
        title: 'Energy Monitor',
        desc: 'Track and optimize your energy usage',
        prompt: 'Monitor my HomeAssistant energy data. Every evening at 9pm: (1) Report today\'s energy consumption vs. last week\'s average, (2) Flag any devices using more than usual, (3) Suggest optimizations, (4) Alert me if solar generation dropped significantly (might indicate a panel issue).',
        difficulty: 'Advanced',
        time: '10 min',
      },
    ],
  },
];

export default function Templates() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedIdx, setCopiedIdx] = useState(null);

  const categories = ['all', ...TEMPLATES.map(t => t.category)];
  const allItems = TEMPLATES.flatMap(t => t.items.map(item => ({ ...item, category: t.category })));
  const filtered = activeCategory === 'all' ? allItems : allItems.filter(i => i.category === activeCategory);

  const copyPrompt = (prompt, idx) => {
    navigator.clipboard.writeText(prompt);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Preset Templates</h1>
        <p className="text-dark-300 text-lg max-w-2xl mx-auto">
          Ready-to-use instruction templates for common tasks. Copy a prompt, paste it into your agent, and go.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-sm capitalize ${activeCategory === cat ? 'nav-link-active' : 'nav-link'}`}
          >
            {cat === 'all' ? 'All Templates' : cat}
          </button>
        ))}
      </div>

      {/* Templates */}
      <div className="space-y-4">
        {filtered.map((item, i) => (
          <div key={i} className="card-hover">
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-white font-semibold text-lg">{item.title}</h3>
                  <span className={
                    item.difficulty === 'Beginner' ? 'badge-green' :
                    item.difficulty === 'Intermediate' ? 'badge-blue' :
                    'badge-purple'
                  }>
                    {item.difficulty}
                  </span>
                  <span className="badge-orange">{item.time}</span>
                </div>
                <p className="text-dark-300 mb-3">{item.desc}</p>
                <div className="bg-dark-950 border border-dark-700 rounded-lg p-4 font-mono text-sm text-dark-300 leading-relaxed">
                  {item.prompt}
                </div>
              </div>
              <div className="flex lg:flex-col gap-2 lg:pt-8 flex-shrink-0">
                <button
                  onClick={() => copyPrompt(item.prompt, i)}
                  className="btn-secondary text-sm px-4 py-2 whitespace-nowrap"
                >
                  {copiedIdx === i ? 'Copied!' : 'Copy Prompt'}
                </button>
                <Link
                  href={`/workspace?prompt=${encodeURIComponent(item.prompt)}`}
                  className="btn-primary text-sm px-4 py-2 text-center whitespace-nowrap"
                >
                  Use Template
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
