import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';

export default function Workspace() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || 'local-dev-user';

  // Chat state
  const [msg, setMsg] = useState('');
  const [logs, setLogs] = useState([
    { role: 'system', text: 'Welcome to your OpenClaw agent. Type a command or paste a template to get started.' },
  ]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  // Session state
  const [sessions, setSessions] = useState([]);
  const [activeSessionKey, setActiveSessionKey] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Set default session key based on user
  useEffect(() => {
    if (userId) {
      setActiveSessionKey(`agent:main:web:${userId}`);
    }
  }, [userId]);

  // Load prompt from query params
  useEffect(() => {
    if (router.query.prompt) {
      setMsg(router.query.prompt);
    }
  }, [router.query.prompt]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, streamingText]);

  // Fetch sessions on mount
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const resp = await fetch('/api/sessions');
      if (resp.ok) {
        const data = await resp.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Send message via SSE
  const send = async () => {
    if (!msg.trim() || loading) return;
    const userMsg = { role: 'user', text: msg };
    setLogs(l => [...l, userMsg]);
    const currentMsg = msg;
    setMsg('');
    setLoading(true);
    setStreamingText('');

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMsg,
          sessionKey: activeSessionKey,
        }),
        signal: abortController.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

      // Read the SSE stream
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

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
            // Final message — may contain the complete text
            const finalText = event.message || accumulated;
            accumulated = finalText;
            setStreamingText('');
            setLogs(l => [...l, { role: 'assistant', text: finalText }]);
          } else if (event.state === 'error') {
            setStreamingText('');
            setLogs(l => [...l, {
              role: 'error',
              text: `Error: ${event.errorMessage || 'Unknown error'}`,
            }]);
          } else if (event.state === 'aborted') {
            setStreamingText('');
            setLogs(l => [...l, {
              role: 'system',
              text: 'Agent response was aborted.',
            }]);
          } else if (event.state === 'done') {
            // Stream complete marker — if we haven't added a final message yet
            if (accumulated && !logs.find(l => l.text === accumulated)) {
              setStreamingText('');
              setLogs(l => {
                // Only add if the last message isn't already this text
                const last = l[l.length - 1];
                if (last?.text === accumulated) return l;
                return [...l, { role: 'assistant', text: accumulated }];
              });
            }
          }
        }
      }

      // If stream ended but we still have unreported accumulated text
      if (accumulated && streamingText) {
        setStreamingText('');
        setLogs(l => {
          const last = l[l.length - 1];
          if (last?.role === 'assistant' && last?.text === accumulated) return l;
          return [...l, { role: 'assistant', text: accumulated }];
        });
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setStreamingText('');
        setLogs(l => [...l, { role: 'system', text: 'Request cancelled.' }]);
      } else {
        setStreamingText('');
        setLogs(l => [...l, { role: 'error', text: `Error: ${e.message}` }]);
      }
    } finally {
      setLoading(false);
      setStreamingText('');
      abortRef.current = null;
    }
  };

  const cancelStream = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Session management
  const createNewSession = async () => {
    const newKey = `agent:main:web:${userId}:${Date.now()}`;
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey: newKey, reason: 'new' }),
      });
      setActiveSessionKey(newKey);
      setLogs([
        { role: 'system', text: 'New session started. Type a command or paste a template to get started.' },
      ]);
      fetchSessions();
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const switchSession = async (key) => {
    setActiveSessionKey(key);
    setLogs([{ role: 'system', text: 'Loading session history...' }]);
    setStreamingText('');

    try {
      const resp = await fetch(`/api/history?sessionKey=${encodeURIComponent(key)}`);
      if (resp.ok) {
        const data = await resp.json();
        const history = (data.messages || []).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          text: m.content || m.message || '',
        }));
        if (history.length > 0) {
          setLogs(history);
        } else {
          setLogs([{ role: 'system', text: 'Session loaded. No previous messages.' }]);
        }
      } else {
        setLogs([{ role: 'system', text: 'Session switched. Could not load history.' }]);
      }
    } catch {
      setLogs([{ role: 'system', text: 'Session switched.' }]);
    }
  };

  const deleteSession = async (key) => {
    try {
      await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey: key }),
      });
      fetchSessions();
      if (key === activeSessionKey) {
        setActiveSessionKey(`agent:main:web:${userId}`);
        setLogs([
          { role: 'system', text: 'Session deleted. Switched to default session.' },
        ]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Session Sidebar */}
      {sidebarOpen && (
        <div className="w-64 flex-shrink-0 bg-dark-900 border-r border-dark-700 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-dark-700 flex items-center justify-between">
            <span className="text-sm font-medium text-dark-200">Sessions</span>
            <button
              onClick={createNewSession}
              className="text-xs px-2 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white transition-colors"
              title="New session"
            >
              + New
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Default session */}
            <button
              onClick={() => switchSession(`agent:main:web:${userId}`)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSessionKey === `agent:main:web:${userId}`
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'text-dark-300 hover:bg-dark-800'
              }`}
            >
              <div className="font-medium truncate">Default Session</div>
              <div className="text-xs opacity-60 truncate">agent:main:web</div>
            </button>

            {/* Other sessions */}
            {sessions.map(s => (
              <div
                key={s.key}
                className={`group relative rounded-lg transition-colors ${
                  activeSessionKey === s.key
                    ? 'bg-brand-600/20 border border-brand-500/30'
                    : 'hover:bg-dark-800'
                }`}
              >
                <button
                  onClick={() => switchSession(s.key)}
                  className="w-full text-left px-3 py-2 text-sm"
                >
                  <div className={`font-medium truncate ${
                    activeSessionKey === s.key ? 'text-brand-400' : 'text-dark-300'
                  }`}>
                    {s.title || s.key.split(':').pop() || 'Untitled'}
                  </div>
                  {s.lastMessage && (
                    <div className="text-xs text-dark-500 truncate mt-0.5">
                      {s.lastMessage}
                    </div>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.key); }}
                  className="absolute top-2 right-2 hidden group-hover:block text-dark-500 hover:text-red-400 text-xs px-1"
                  title="Delete session"
                >
                  x
                </button>
              </div>
            ))}

            {loadingSessions && (
              <div className="text-xs text-dark-500 text-center py-2">Loading...</div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-6 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-dark-400 hover:text-white transition-colors"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Agent Workspace</h1>
              <p className="text-dark-400 text-sm">Your OpenClaw agent session</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            <span className="text-dark-400 text-sm">Agent Online</span>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto bg-dark-900 border border-dark-700 rounded-xl p-4 mb-4 space-y-3">
          {logs.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-brand-600 text-white'
                  : m.role === 'error'
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                    : 'bg-dark-800 border border-dark-700 text-dark-200'
              }`}>
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

          {/* Loading indicator (when waiting for first token) */}
          {loading && !streamingText && (
            <div className="flex justify-start">
              <div className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-dark-400 text-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
          <textarea
            className="flex-1 bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-dark-500"
            rows={2}
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a command, paste a template, or ask your agent anything..."
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
    </div>
  );
}
