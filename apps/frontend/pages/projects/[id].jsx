import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import UsageMeter from '../../components/UsageMeter';
import UpgradePrompt from '../../components/UpgradePrompt';
import FileUploader from '../../components/FileUploader';
import FileList from '../../components/FileList';

export default function ProjectWorkspace() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const { user, profile, supabase } = useAuth();
  const userId = user?.id || 'local-dev-user';
  const agentPrefix = profile?.openclaw_agent_id || 'main';

  // Project state
  const [project, setProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [activeSessionKey, setActiveSessionKey] = useState('');

  // Chat state
  const [msg, setMsg] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Upgrade prompt state
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [usageData, setUsageData] = useState(null);

  // Editable project fields
  const [editInstructions, setEditInstructions] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // File upload refresh trigger
  const [fileRefresh, setFileRefresh] = useState(0);
  const handleFilesChange = useCallback(() => setFileRefresh((n) => n + 1), []);

  // File upload modal (inline attach)
  const [showFileUpload, setShowFileUpload] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }, [supabase]);

  // Fetch project details
  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setProjectLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/projects', { headers });
      if (resp.ok) {
        const data = await resp.json();
        const found = (data.projects || []).find((p) => p.id === projectId);
        if (found) {
          setProject(found);
          setEditInstructions(found.instructions || '');
          setEditName(found.name || '');
          setEditDescription(found.description || '');
        } else {
          router.push('/projects');
        }
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
    } finally {
      setProjectLoading(false);
    }
  }, [projectId, getAuthHeaders, router]);

  // Fetch sessions for this project
  const fetchSessions = useCallback(async () => {
    if (!projectId) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/project-sessions?projectId=${projectId}`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, [projectId, getAuthHeaders]);

  useEffect(() => {
    if (projectId && user) {
      fetchProject();
      fetchSessions();
    }
  }, [projectId, user, fetchProject, fetchSessions]);

  // Auto-create a default session if none exist
  useEffect(() => {
    if (project && sessions.length === 0 && !activeSession && projectId) {
      createNewSession(true);
    }
  }, [project, sessions.length, activeSession, projectId]);

  // Auto-select first session
  useEffect(() => {
    if (sessions.length > 0 && !activeSession) {
      selectSession(sessions[0]);
    }
  }, [sessions, activeSession]);

  // Auto-scroll — instant on history load, smooth on new messages
  const scrollBehaviorRef = useRef('instant');
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has rendered
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: scrollBehaviorRef.current });
      // After first scroll (history load), switch to smooth for new messages
      scrollBehaviorRef.current = 'smooth';
    });
  }, [logs, streamingText]);

  const createNewSession = async (isDefault) => {
    if (!projectId) return;
    const sessionKey = `agent:${agentPrefix}:project:${projectId}:${Date.now()}`;
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      const resp = await fetch('/api/project-sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId,
          sessionKey,
          title: isDefault ? 'Default Session' : `Session ${sessions.length + 1}`,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSessions((prev) => [data.session, ...prev]);
        selectSession(data.session);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const selectSession = (session) => {
    scrollBehaviorRef.current = 'instant'; // Jump to bottom on session load
    setActiveSession(session);
    setActiveSessionKey(session.session_key);
    setLogs([
      {
        role: 'system',
        text: `Session "${session.title}" active. ${project?.instructions ? 'Project instructions loaded.' : 'Type a message to get started.'}`,
      },
    ]);
    setStreamingText('');
    loadSessionHistory(session.session_key);
  };

  const loadSessionHistory = async (sessionKey) => {
    try {
      const resp = await fetch(`/api/history?sessionKey=${encodeURIComponent(sessionKey)}`);
      if (resp.ok) {
        const data = await resp.json();
        const history = (data.messages || []).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          text: m.content || m.message || '',
        }));
        if (history.length > 0) {
          setLogs(history);
        }
      }
    } catch {
      // History load failed — keep welcome message
    }
  };

  const deleteSession = async (e, session) => {
    e.stopPropagation();
    if (sessions.length <= 1) return; // Keep at least one session
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      await fetch('/api/project-sessions', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: session.id }),
      });
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      if (activeSession?.id === session.id) {
        const remaining = sessions.filter((s) => s.id !== session.id);
        if (remaining.length > 0) selectSession(remaining[0]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // Send message via SSE — same pattern as workspace.jsx
  const send = async () => {
    if (!msg.trim() || loading) return;
    const userMsg = { role: 'user', text: msg };
    setLogs((l) => [...l, userMsg]);
    const currentMsg = msg;
    setMsg('');
    setLoading(true);
    setStreamingText('');

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: currentMsg,
          sessionKey: activeSessionKey,
          instructions: project?.instructions || '',
        }),
        signal: abortController.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 402 && errData.upgrade) {
          setUsageData({ used: errData.used, limit: errData.limit, tier: errData.tier });
          setShowUpgrade(true);
          setLoading(false);
          return;
        }
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

      // Refresh usage meter after sending
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('usage-refresh'));
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          let event;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (event.state === 'delta' && event.message) {
            accumulated += event.message;
            setStreamingText(accumulated);
          } else if (event.state === 'final') {
            const finalText = event.message || accumulated;
            accumulated = finalText;
            setStreamingText('');
            setLogs((l) => [...l, { role: 'assistant', text: finalText }]);
          } else if (event.state === 'error') {
            setStreamingText('');
            setLogs((l) => [
              ...l,
              { role: 'error', text: `Error: ${event.errorMessage || 'Unknown error'}` },
            ]);
          } else if (event.state === 'aborted') {
            setStreamingText('');
            setLogs((l) => [...l, { role: 'system', text: 'Agent response was aborted.' }]);
          } else if (event.state === 'done') {
            if (accumulated) {
              setStreamingText('');
              setLogs((l) => {
                const last = l[l.length - 1];
                if (last?.text === accumulated) return l;
                return [...l, { role: 'assistant', text: accumulated }];
              });
            }
          }
        }
      }

      if (accumulated && streamingText) {
        setStreamingText('');
        setLogs((l) => {
          const last = l[l.length - 1];
          if (last?.role === 'assistant' && last?.text === accumulated) return l;
          return [...l, { role: 'assistant', text: accumulated }];
        });
      }

      // Update session last_message
      if (activeSession) {
        try {
          const hdr = {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
          };
          await fetch('/api/project-sessions', {
            method: 'PATCH',
            headers: hdr,
            body: JSON.stringify({
              id: activeSession.id,
              last_message: currentMsg.slice(0, 100),
            }),
          });
        } catch {
          // non-critical
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setStreamingText('');
        setLogs((l) => [...l, { role: 'system', text: 'Request cancelled.' }]);
      } else {
        setStreamingText('');
        setLogs((l) => [...l, { role: 'error', text: `Error: ${e.message}` }]);
      }
    } finally {
      setLoading(false);
      setStreamingText('');
      abortRef.current = null;
    }
  };

  const cancelStream = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Save project settings
  const saveSettings = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      const resp = await fetch('/api/projects', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: project.id,
          name: editName.trim(),
          description: editDescription.trim(),
          instructions: editInstructions.trim(),
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setProject(data.project);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (projectLoading || !projectId) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 4rem)' }}>
        <div className="text-dark-400">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 4rem)' }}>
        <div className="text-dark-400">Project not found.</div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Left Sidebar — Project Info & Sessions */}
      {sidebarOpen && (
        <div className="w-64 flex-shrink-0 bg-dark-900 border-r border-dark-700 flex flex-col">
          {/* Project Header */}
          <div className="p-3 border-b border-dark-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{project.icon}</span>
              <span className="text-sm font-semibold text-white truncate">{project.name}</span>
            </div>
            {project.description && (
              <p className="text-xs text-dark-400 truncate">{project.description}</p>
            )}
            <button
              onClick={() => router.push('/projects')}
              className="text-xs text-dark-500 hover:text-brand-400 mt-1 transition-colors"
            >
              &larr; All Projects
            </button>
          </div>

          {/* Sessions Header */}
          <div className="p-3 border-b border-dark-700 flex items-center justify-between">
            <span className="text-sm font-medium text-dark-200">Sessions</span>
            <button
              onClick={() => createNewSession(false)}
              className="text-xs px-2 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white transition-colors"
            >
              + New
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group relative rounded-lg transition-colors ${
                  activeSession?.id === s.id
                    ? 'bg-brand-600/20 border border-brand-500/30'
                    : 'hover:bg-dark-800'
                }`}
              >
                <button
                  onClick={() => selectSession(s)}
                  className="w-full text-left px-3 py-2 text-sm"
                >
                  <div
                    className={`font-medium truncate ${
                      activeSession?.id === s.id ? 'text-brand-400' : 'text-dark-300'
                    }`}
                  >
                    {s.title || 'Untitled'}
                  </div>
                  {s.last_message && (
                    <div className="text-xs text-dark-500 truncate mt-0.5">{s.last_message}</div>
                  )}
                </button>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => deleteSession(e, s)}
                    className="absolute top-2 right-2 hidden group-hover:block text-dark-500 hover:text-red-400 text-xs px-1"
                    title="Delete session"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Project Files in sidebar */}
          <div className="border-t border-dark-700 p-2 max-h-64 overflow-y-auto">
            <FileList
              projectId={projectId}
              getAuthHeaders={getAuthHeaders}
              refreshTrigger={fileRefresh}
              compact
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-dark-700 flex items-center justify-between bg-dark-900/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-dark-400 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">
                {project.icon} {project.name}
              </h1>
              <p className="text-dark-500 text-xs">
                {activeSession?.title || 'No session selected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UsageMeter onLimitReached={(data) => { setUsageData(data); setShowUpgrade(true); }} />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
              <span className="text-dark-400 text-sm">Agent Online</span>
            </div>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                settingsOpen
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col px-4 sm:px-6 py-4 min-w-0">
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto bg-dark-900 border border-dark-700 rounded-xl p-4 mb-4 space-y-3">
              {logs.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 ${
                      m.role === 'user'
                        ? 'bg-brand-600 text-white'
                        : m.role === 'error'
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                          : 'bg-dark-800 border border-dark-700 text-dark-200'
                    }`}
                  >
                    {m.role !== 'user' && (
                      <div className="text-xs font-medium mb-1 opacity-60 uppercase">
                        {m.role === 'system' ? 'System' : m.role === 'error' ? 'Error' : 'Agent'}
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  </div>
                </div>
              ))}

              {/* Streaming text */}
              {streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl px-4 py-3 bg-dark-800 border border-dark-700 text-dark-200">
                    <div className="text-xs font-medium mb-1 opacity-60 uppercase">Agent</div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {streamingText}
                      <span className="inline-block w-1.5 h-4 bg-brand-500 ml-0.5 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {loading && !streamingText && (
                <div className="flex justify-start">
                  <div className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-dark-400 text-sm">
                      <div className="flex gap-1">
                        <div
                          className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <div
                          className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <div
                          className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                      Agent is working...
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFileUpload(true)}
                className="self-end text-dark-400 hover:text-brand-400 transition-colors p-2.5"
                title="Attach file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <textarea
                className="flex-1 bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-dark-500"
                rows={2}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Message ${project.name}...`}
              />
              {loading ? (
                <button
                  onClick={cancelStream}
                  className="px-6 self-end rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium py-2.5 transition-colors"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!msg.trim()}
                  className="btn-primary px-6 self-end disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar — Settings */}
          {settingsOpen && (
            <div className="w-80 flex-shrink-0 border-l border-dark-700 bg-dark-900 overflow-y-auto">
              <div className="p-4 space-y-5">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Project Settings
                </h3>

                {/* Name */}
                <div>
                  <label className="block text-xs text-dark-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-dark-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-xs text-dark-400 mb-1">
                    Instructions (system prompt)
                  </label>
                  <textarea
                    value={editInstructions}
                    onChange={(e) => setEditInstructions(e.target.value)}
                    rows={6}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="btn-primary w-full disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>

                {/* Pinned Functions */}
                <div>
                  <h4 className="text-xs text-dark-400 mb-2 uppercase tracking-wide">
                    Pinned Functions
                  </h4>
                  {project.functions && project.functions.length > 0 ? (
                    <div className="space-y-1">
                      {project.functions.map((fn) => (
                        <div
                          key={fn}
                          className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg"
                        >
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                          <span className="text-sm text-dark-200">{fn}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-dark-500">No functions pinned to this project.</p>
                  )}
                </div>

                {/* File Upload */}
                <div>
                  <h4 className="text-xs text-dark-400 mb-2 uppercase tracking-wide">
                    Project Files
                  </h4>
                  <FileUploader
                    projectId={projectId}
                    sessionKey={activeSessionKey}
                    getAuthHeaders={getAuthHeaders}
                    onFilesChange={handleFilesChange}
                  />
                  <div className="mt-3">
                    <FileList
                      projectId={projectId}
                      getAuthHeaders={getAuthHeaders}
                      refreshTrigger={fileRefresh}
                    />
                  </div>
                </div>

                {/* Project Info */}
                <div className="pt-3 border-t border-dark-700">
                  <p className="text-xs text-dark-500">
                    Created{' '}
                    {project.created_at
                      ? new Date(project.created_at).toLocaleDateString()
                      : 'recently'}
                  </p>
                  <p className="text-xs text-dark-500">
                    {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowFileUpload(false)}>
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Upload Files</h3>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-dark-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-dark-500 mb-3">
              Files uploaded here are available as context for this project.
            </p>
            <FileUploader
              projectId={projectId}
              sessionKey={activeSessionKey}
              getAuthHeaders={getAuthHeaders}
              onFilesChange={() => { handleFilesChange(); setShowFileUpload(false); }}
            />
          </div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgrade && (
        <UpgradePrompt usage={usageData} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}
