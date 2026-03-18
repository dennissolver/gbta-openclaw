import React, { useState, useRef } from 'react';

export default function ChatPanel({ onPatchGenerated }) {
  const [msg, setMsg] = useState('');
  const [logs, setLogs] = useState([{ role: 'system', text: 'Welcome to OpenClaw. Type a message to talk to the agent.' }]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef(null);

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
        body: JSON.stringify({ message: currentMsg }),
        signal: abortController.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${resp.status}`);
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
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.state === 'delta' && event.message) {
            accumulated += event.message;
            setStreamingText(accumulated);
          } else if (event.state === 'final') {
            const finalText = event.message || accumulated;
            setStreamingText('');
            setLogs(l => [...l, { role: 'assistant', text: finalText }]);
            if (onPatchGenerated) onPatchGenerated({ text: finalText });
          } else if (event.state === 'error') {
            setStreamingText('');
            setLogs(l => [...l, { role: 'assistant', text: `Error: ${event.errorMessage || 'Unknown error'}` }]);
          }
        }
      }

      if (accumulated && streamingText) {
        setStreamingText('');
        setLogs(l => {
          const last = l[l.length - 1];
          if (last?.role === 'assistant' && last?.text === accumulated) return l;
          return [...l, { role: 'assistant', text: accumulated }];
        });
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setStreamingText('');
        setLogs(l => [...l, { role: 'assistant', text: `Error: ${e.message}` }]);
      }
    } finally {
      setLoading(false);
      setStreamingText('');
      abortRef.current = null;
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
          }}>
            <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#666' }}>{m.role}</strong>
            <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{m.text}</div>
          </div>
        ))}
        {streamingText && (
          <div style={{ marginBottom: 8, padding: 6, borderRadius: 4, background: '#f0fdf4' }}>
            <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#666' }}>assistant</strong>
            <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{streamingText}</div>
          </div>
        )}
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
          onClick={loading ? () => abortRef.current?.abort() : send}
          disabled={!loading && !msg.trim()}
          style={{
            padding: '8px 20px',
            background: loading ? '#dc2626' : '#0070f3',
            color: '#fff', border: 'none', borderRadius: 4,
          }}
        >
          {loading ? 'Stop' : 'Send'}
        </button>
      </div>
    </div>
  );
}
