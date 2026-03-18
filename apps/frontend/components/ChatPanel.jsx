import React, { useState } from 'react';
// Using native fetch — no axios dependency needed

export default function ChatPanel({ onPatchGenerated }) {
  const [msg, setMsg] = useState('');
  const [logs, setLogs] = useState([{ role: 'system', text: 'Welcome to OpenClaw. Type a message to invoke a function.' }]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!msg.trim()) return;
    const userMsg = { role: 'user', text: msg };
    setLogs(l => [...l, userMsg]);
    setMsg('');
    setLoading(true);

    try {
      const resp = await fetch('/api/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'generatePatchSkeleton',
          inputs: {
            urls: ['https://buy.nsw.gov.au/login', 'https://buy.nsw.gov.au/login/signup'],
            targetDir: 'workspace/nsw',
          },
        }),
      });
      const data = await resp.json();
      const out = data.outputs?.patch || JSON.stringify(data.outputs);
      setLogs(l => [...l, { role: 'assistant', text: out }]);
      if (onPatchGenerated) onPatchGenerated(data.outputs);
    } catch (e) {
      setLogs(l => [...l, { role: 'assistant', text: `Error: ${e.message}` }]);
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flex: 1, border: '1px solid #ddd', borderRadius: 6, padding: 12,
        overflow: 'auto', background: '#fff', marginBottom: 8,
      }}>
        {logs.map((m, i) => (
          <div key={i} style={{
            marginBottom: 8, padding: 6, borderRadius: 4,
            background: m.role === 'user' ? '#e8f0fe' : m.role === 'system' ? '#f5f5f5' : '#f0fdf4',
            textAlign: m.role === 'user' ? 'left' : 'left',
          }}>
            <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#666' }}>{m.role}</strong>
            <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }}
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask OpenClaw..."
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            padding: '8px 20px', background: loading ? '#ccc' : '#0070f3',
            color: '#fff', border: 'none', borderRadius: 4,
          }}
        >
          {loading ? 'Working...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
