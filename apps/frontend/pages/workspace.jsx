import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function Workspace() {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [logs, setLogs] = useState([
    { role: 'system', text: 'Welcome to your OpenClaw agent. Type a command or paste a template to get started.' },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (router.query.prompt) {
      setMsg(router.query.prompt);
    }
  }, [router.query.prompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const send = async () => {
    if (!msg.trim() || loading) return;
    const userMsg = { role: 'user', text: msg };
    setLogs(l => [...l, userMsg]);
    const currentMsg = msg;
    setMsg('');
    setLoading(true);

    try {
      const resp = await fetch('/api/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'generatePatchSkeleton',
          inputs: { message: currentMsg, urls: [], targetDir: 'workspace/default' },
        }),
      });
      const data = await resp.json();
      const output = data.outputs?.patch || data.outputs?.qa || data.outputs?.summary || JSON.stringify(data.outputs, null, 2);
      setLogs(l => [...l, { role: 'assistant', text: output }]);
    } catch (e) {
      setLogs(l => [...l, { role: 'error', text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Agent Workspace</h1>
          <p className="text-dark-400 text-sm">Your OpenClaw agent session</p>
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
        {loading && (
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
        <button
          onClick={send}
          disabled={loading || !msg.trim()}
          className="btn-primary px-6 self-end disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
