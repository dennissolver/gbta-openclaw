import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';

const TEMPLATES = [
  {
    name: 'Email Management',
    icon: '\ud83d\udce7',
    description: 'Manage, organize, and automate your email inbox',
    color: 'brand',
    instructions:
      'You are an email management assistant. Help me process, categorize, and respond to emails. Prioritize urgent items, draft replies, and organize by importance.',
    functions: ['processInbox', 'draftReply', 'categorizeEmails'],
  },
  {
    name: 'Code & DevOps',
    icon: '\ud83d\udcbb',
    description: 'Review code, manage deployments, and automate dev workflows',
    color: 'blue',
    instructions:
      'You are a senior developer assistant. Help with code reviews, CI/CD pipelines, deployment monitoring, and technical problem-solving. Be concise and precise.',
    functions: ['reviewPR', 'checkDeploy', 'runTests', 'analyzeErrors'],
  },
  {
    name: 'Content & Marketing',
    icon: '\ud83d\udcdd',
    description: 'Create, schedule, and manage content across platforms',
    color: 'purple',
    instructions:
      'You are a content marketing specialist. Help draft posts, create content calendars, analyze engagement, and manage publishing across platforms.',
    functions: ['draftPost', 'contentCalendar', 'analyzeEngagement'],
  },
  {
    name: 'Research & Analysis',
    icon: '\ud83d\udd0d',
    description: 'Deep research, document analysis, and competitive intelligence',
    color: 'orange',
    instructions:
      'You are a research analyst. Help me find information, analyze documents, summarize reports, and track competitive intelligence. Always cite sources.',
    functions: ['webSearch', 'summarizeDocument', 'compareData'],
  },
  {
    name: 'Business Operations',
    icon: '\ud83d\udcca',
    description: 'Invoices, reports, client management, and workflows',
    color: 'brand',
    instructions:
      'You are a business operations assistant for an Australian company. Help with invoicing, client management, reporting, and workflow automation. Use AUD and Australian business conventions.',
    functions: ['generateInvoice', 'clientLookup', 'weeklyReport'],
  },
  {
    name: 'Daily Assistant',
    icon: '\u2600\ufe0f',
    description: 'Briefings, scheduling, reminders, and personal tasks',
    color: 'blue',
    instructions:
      'You are a personal daily assistant in the AEST timezone. Help with scheduling, reminders, daily briefings, and task management. Be proactive and organized.',
    functions: ['dailyBriefing', 'scheduleTask', 'setReminder'],
  },
];

const COLOR_MAP = {
  brand: {
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/30',
    text: 'text-brand-400',
    hoverBorder: 'hover:border-brand-500/60',
    ring: 'ring-brand-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    hoverBorder: 'hover:border-blue-500/60',
    ring: 'ring-blue-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    hoverBorder: 'hover:border-purple-500/60',
    ring: 'ring-purple-500/20',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    hoverBorder: 'hover:border-orange-500/60',
    ring: 'ring-orange-500/20',
  },
};

function getColor(name) {
  return COLOR_MAP[name] || COLOR_MAP.brand;
}

export default function ProjectsIndex() {
  const router = useRouter();
  const { user, supabase } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('\ud83d\udcc1');
  const [formColor, setFormColor] = useState('brand');
  const [formInstructions, setFormInstructions] = useState('');
  const [formFunctions, setFormFunctions] = useState('');

  const getAuthHeaders = useCallback(async () => {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }, [supabase]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/projects', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (user) fetchProjects();
    else setLoading(false);
  }, [user, fetchProjects]);

  const createProject = async (overrides) => {
    setCreating(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };

      const body = overrides || {
        name: formName.trim(),
        description: formDesc.trim(),
        icon: formIcon,
        color: formColor,
        instructions: formInstructions.trim(),
        functions: formFunctions
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
      };

      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        const data = await resp.json();
        // Navigate to the new project
        router.push(`/projects/${data.project.id}`);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreating(false);
    }
  };

  const createFromTemplate = (template) => {
    createProject({
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      instructions: template.instructions,
      functions: template.functions,
    });
  };

  const togglePin = async (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      await fetch('/api/projects', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: project.id, pinned: !project.pinned }),
      });
      fetchProjects();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const deleteProject = async (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      await fetch('/api/projects', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: project.id }),
      });
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Projects</h1>
        <p className="text-dark-300 mb-8">Sign in to create and manage your AI projects.</p>
        <Link href="/onboarding" className="btn-primary">
          Get Started
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-dark-400 mt-1">
            Organized workspaces with custom instructions, pinned functions, and sessions.
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          + Create Project
        </button>
      </div>

      {/* Create Project Form */}
      {showCreate && (
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">New Project</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                placeholder="My Project"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Icon & Color</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="w-16 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-brand-500"
                />
                <select
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="flex-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="brand">Green</option>
                  <option value="blue">Blue</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-dark-300 mb-1">Description</label>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              placeholder="What this project is about..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-dark-300 mb-1">Instructions (system prompt)</label>
            <textarea
              value={formInstructions}
              onChange={(e) => setFormInstructions(e.target.value)}
              rows={3}
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-brand-500"
              placeholder="You are a helpful assistant that..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-dark-300 mb-1">
              Pinned Functions (comma-separated)
            </label>
            <input
              type="text"
              value={formFunctions}
              onChange={(e) => setFormFunctions(e.target.value)}
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              placeholder="functionA, functionB, functionC"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createProject()}
              disabled={!formName.trim() || creating}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Templates Section */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-1">Start from a Template</h2>
        <p className="text-dark-400 text-sm mb-4">
          Pre-configured projects to get you started quickly.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => {
            const c = getColor(t.color);
            return (
              <button
                key={t.name}
                onClick={() => createFromTemplate(t)}
                disabled={creating}
                className={`text-left p-5 rounded-xl border ${c.border} ${c.bg} ${c.hoverBorder} transition-all duration-200 hover:shadow-lg disabled:opacity-50`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{t.icon}</span>
                  <span className={`font-semibold ${c.text}`}>{t.name}</span>
                </div>
                <p className="text-dark-300 text-sm mb-3">{t.description}</p>
                <div className="flex flex-wrap gap-1">
                  {t.functions.map((fn) => (
                    <span
                      key={fn}
                      className="text-xs px-2 py-0.5 rounded bg-dark-800/60 text-dark-400 border border-dark-700"
                    >
                      {fn}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* User's Projects */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Your Projects</h2>
        {loading ? (
          <div className="text-dark-400 text-center py-12">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">{'\ud83d\udcc2'}</div>
            <p className="text-dark-300 mb-2">No projects yet</p>
            <p className="text-dark-500 text-sm">
              Create a project above or start from a template.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const c = getColor(p.color);
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className={`card-hover group relative block`}
                >
                  {/* Pin indicator */}
                  {p.pinned && (
                    <div className="absolute top-3 right-3 text-brand-400 text-xs">
                      {'\ud83d\udccc'}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${c.bg} ${c.border} border`}
                    >
                      {p.icon || '\ud83d\udcc1'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">{p.name}</h3>
                      <p className="text-dark-500 text-xs">
                        {p.session_count || 0} session{p.session_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-dark-400 text-sm mb-3 line-clamp-2">{p.description}</p>
                  )}

                  {p.functions && p.functions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.functions.slice(0, 3).map((fn) => (
                        <span
                          key={fn}
                          className="text-xs px-2 py-0.5 rounded bg-dark-800 text-dark-400 border border-dark-700"
                        >
                          {fn}
                        </span>
                      ))}
                      {p.functions.length > 3 && (
                        <span className="text-xs text-dark-500">
                          +{p.functions.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => togglePin(e, p)}
                      className="text-xs text-dark-500 hover:text-brand-400 transition-colors"
                    >
                      {p.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={(e) => deleteProject(e, p)}
                      className="text-xs text-dark-500 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
