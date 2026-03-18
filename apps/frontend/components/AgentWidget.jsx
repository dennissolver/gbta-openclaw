import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';

const ELEVENLABS_AGENT_ID = 'agent_6301km090vapeakbxnm98fjsc8q1';

/**
 * Floating agent widget — available on all pages.
 * Two modes: text chat and voice (ElevenLabs).
 * Renders as a FAB (floating action button) in the bottom-right corner.
 */
export default function AgentWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('text'); // text | voice
  const [minimized, setMinimized] = useState(false);

  // Don't render if not logged in
  if (!user) return null;

  return (
    <>
      {/* FAB button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-200 flex items-center justify-center group"
          title="Talk to your agent"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-dark-950 animate-pulse" />
        </button>
      )}

      {/* Widget panel */}
      {open && (
        <div className={`fixed z-50 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl transition-all duration-300 ${
          minimized
            ? 'bottom-6 right-6 w-72 h-12'
            : 'bottom-6 right-6 w-96 h-[32rem] flex flex-col'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">EasyOpenClaw Agent</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Mode toggle */}
              <button
                onClick={() => setMode(mode === 'text' ? 'voice' : 'text')}
                className={`p-1.5 rounded-lg transition-colors ${mode === 'voice' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-400 hover:text-white'}`}
                title={mode === 'text' ? 'Switch to voice' : 'Switch to text'}
              >
                {mode === 'text' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )}
              </button>
              {/* Minimize */}
              <button
                onClick={() => setMinimized(!minimized)}
                className="p-1.5 rounded-lg text-dark-400 hover:text-white transition-colors"
                title={minimized ? 'Expand' : 'Minimize'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={minimized ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-dark-400 hover:text-white transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          {!minimized && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {mode === 'text' ? (
                <TextChat />
              ) : (
                <VoiceChat />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ─── Text Chat ──────────────────────────────────────────────────── */

function TextChat() {
  const [msg, setMsg] = useState('');
  const [logs, setLogs] = useState([
    { role: 'system', text: 'How can I help you?' },
  ]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, streamingText]);

  const send = async () => {
    if (!msg.trim() || loading) return;
    setLogs(l => [...l, { role: 'user', text: msg }]);
    const currentMsg = msg;
    setMsg('');
    setLoading(true);
    setStreamingText('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentMsg }),
        signal: controller.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

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
            accumulated = '';
          } else if (event.state === 'error') {
            setStreamingText('');
            setLogs(l => [...l, { role: 'error', text: event.errorMessage || 'Error' }]);
          }
        }
      }

      if (accumulated) {
        setStreamingText('');
        setLogs(l => [...l, { role: 'assistant', text: accumulated }]);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setStreamingText('');
        setLogs(l => [...l, { role: 'error', text: e.message }]);
      }
    } finally {
      setLoading(false);
      setStreamingText('');
      abortRef.current = null;
    }
  };

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {logs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
              m.role === 'user'
                ? 'bg-brand-600 text-white'
                : m.role === 'error'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-dark-800 text-dark-200'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
            </div>
          </div>
        ))}
        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs bg-dark-800 text-dark-200">
              <div className="whitespace-pre-wrap leading-relaxed">
                {streamingText}
                <span className="inline-block w-1 h-3 bg-brand-500 ml-0.5 animate-pulse" />
              </div>
            </div>
          </div>
        )}
        {loading && !streamingText && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 bg-dark-800">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-dark-700 flex gap-2">
        <input
          className="flex-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 placeholder-dark-500"
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask anything..."
        />
        <button
          onClick={loading ? () => abortRef.current?.abort() : send}
          disabled={!loading && !msg.trim()}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            loading
              ? 'bg-red-600 text-white'
              : 'bg-brand-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {loading ? 'Stop' : 'Send'}
        </button>
      </div>
    </>
  );
}

/* ─── Voice Chat ─────────────────────────────────────────────────── */

function VoiceChat() {
  const [status, setStatus] = useState('idle'); // idle | loading | requesting | connected | error | unsupported
  const [errorMsg, setErrorMsg] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [hookReady, setHookReady] = useState(false);
  const [UseConv, setUseConv] = useState(null);

  // Dynamic import of ElevenLabs
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setStatus('unsupported');
      setErrorMsg('Your browser does not support microphone access.');
      return;
    }

    setStatus('loading');
    import('@elevenlabs/react')
      .then((mod) => {
        setUseConv(() => mod.useConversation);
        setHookReady(true);
        setStatus('idle');
      })
      .catch(() => {
        setStatus('unsupported');
        setErrorMsg('Voice library failed to load.');
      });
  }, []);

  if (status === 'unsupported') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-3xl mb-3">🎤</div>
        <p className="text-dark-400 text-sm mb-2">{errorMsg}</p>
        <p className="text-dark-500 text-xs">Try using Chrome or Edge on desktop.</p>
      </div>
    );
  }

  if (!hookReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return <VoiceSessionInner UseConversation={UseConv} transcript={transcript} setTranscript={setTranscript} />;
}

function VoiceSessionInner({ UseConversation, transcript, setTranscript }) {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const bottomRef = useRef(null);

  const conversation = UseConversation({
    onConnect: () => { setStatus('connected'); setErrorMsg(''); },
    onDisconnect: () => { setStatus('idle'); },
    onMessage: (message) => {
      setTranscript(t => [...t, {
        role: message.source === 'user' ? 'user' : 'assistant',
        text: message.message,
      }]);
    },
    onError: (error) => {
      setStatus('error');
      setErrorMsg(typeof error === 'string' ? error : error?.message || 'Connection error');
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const isConnected = conversation.status === 'connected';
  const speaking = conversation.isSpeaking;

  const startSession = async () => {
    setStatus('requesting');
    setErrorMsg('');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('error');
      setErrorMsg('Microphone permission denied.');
      return;
    }
    try {
      await conversation.startSession({ agentId: ELEVENLABS_AGENT_ID });
    } catch (err) {
      setStatus('error');
      setErrorMsg(`Failed to connect: ${err.message || 'Unknown error'}`);
    }
  };

  const endSession = async () => {
    try { await conversation.endSession(); } catch {}
    setStatus('idle');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {transcript.length === 0 && !isConnected && (
          <div className="text-center text-dark-500 text-xs pt-8">
            Tap the mic to start a voice conversation
          </div>
        )}
        {transcript.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
              m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-dark-800 text-dark-200'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Voice controls */}
      <div className="p-4 border-t border-dark-700 flex flex-col items-center gap-2">
        {speaking && (
          <div className="flex gap-0.5 items-end h-4 mb-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-brand-500 rounded-full animate-pulse"
                style={{
                  height: `${8 + Math.random() * 8}px`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '0.6s',
                }}
              />
            ))}
          </div>
        )}

        <button
          onClick={isConnected ? endSession : startSession}
          disabled={status === 'requesting'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            isConnected
              ? 'bg-red-500 hover:bg-red-400 text-white'
              : status === 'requesting'
                ? 'bg-dark-700 text-dark-400 cursor-wait'
                : 'bg-brand-500 hover:bg-brand-400 text-white'
          }`}
        >
          {isConnected ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        <span className="text-dark-500 text-xs">
          {isConnected ? 'Tap to stop' : status === 'requesting' ? 'Connecting...' : 'Tap to talk'}
        </span>

        {errorMsg && (
          <p className="text-red-400 text-xs text-center">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
