import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { unlockAchievement } from '../components/AchievementTracker';

const DISCOVERY_QUESTIONS = [
  "Hi! I'm your Discovery Coach. I'd love to learn about your workflow so I can recommend the best automations for you. To start, what's your role and what does a typical day look like?",
  "That's helpful! What are the most repetitive or time-consuming tasks in your day?",
  "Do you work with email a lot? How many emails do you handle daily, and do you have patterns for how you process them?",
  "What tools and platforms does your team use? (e.g. Slack, Teams, Jira, Google Workspace, GitHub)",
  "Are there any reports or summaries you create regularly? Weekly status updates, daily briefings, etc.?",
  "Do you manage any scheduled or recurring tasks that you wish could run automatically?",
  "Last question: Is there anything you've wished an AI could handle for you but haven't found a solution for yet?",
];

const AGENT_ID = 'agent_6301km090vapeakbxnm98fjsc8q1';

export default function Discover() {
  const router = useRouter();
  const { user, supabase } = useAuth();
  const [mode, setMode] = useState('text'); // 'text' | 'voice'

  // Handle ?mode=voice query param
  useEffect(() => {
    if (router.query.mode === 'voice') {
      setMode('voice');
    }
  }, [router.query.mode]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Discovery Session</h1>
          <p className="text-dark-400 text-sm mt-1">
            Let your AI coach interview you and recommend the best automations.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-dark-900 border border-dark-700 rounded-lg p-1">
          <button
            onClick={() => setMode('text')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'text'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setMode('voice')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'voice'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            Voice
          </button>
        </div>
      </div>

      {mode === 'text' ? (
        <TextMode user={user} supabase={supabase} router={router} />
      ) : (
        <VoiceMode onSwitchToText={() => setMode('text')} />
      )}
    </div>
  );
}

/* ─── Text Mode ──────────────────────────────────────────────────── */

function TextMode({ user, supabase, router }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: DISCOVERY_QUESTIONS[0] },
  ]);
  const [input, setInput] = useState('');
  const [questionIndex, setQuestionIndex] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [creatingProjects, setCreatingProjects] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isComplete = questionIndex >= DISCOVERY_QUESTIONS.length && !loading;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', text: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    // Track that a chat has happened
    unlockAchievement('first-chat');

    // Extract a quick opportunity from the user response
    const extractedOpp = extractOpportunity(input);
    if (extractedOpp) {
      setOpportunities((o) => [...o, extractedOpp]);
    }

    // Simulate brief thinking, then ask next question or generate recommendations
    await new Promise((r) => setTimeout(r, 800));

    if (questionIndex < DISCOVERY_QUESTIONS.length) {
      const nextQ = DISCOVERY_QUESTIONS[questionIndex];
      setMessages((m) => [...m, { role: 'assistant', text: nextQ }]);
      setQuestionIndex((i) => i + 1);
      setLoading(false);
    } else {
      // All questions answered — generate recommendations
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'Thanks for sharing all that! Let me analyze your workflow and generate personalized project recommendations...',
        },
      ]);
      await generateRecommendations([...messages, userMsg]);
      setLoading(false);
    }
  };

  const generateRecommendations = async (transcript) => {
    try {
      const resp = await fetch('/api/discover-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.map((m) => `${m.role}: ${m.text}`).join('\n'),
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setRecommendations(data.recommendations || []);
        unlockAchievement('discovery-completed');
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: `I've identified ${data.recommendations?.length || 0} automation opportunities for you. Check the recommendations panel to create these as projects!`,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: 'I had trouble generating recommendations. You can still create projects manually from the Projects page.',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to generate recommendations:', err);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'I had trouble connecting to the recommendation engine. Try again later or create projects manually.',
        },
      ]);
    }
  };

  const createAllProjects = async () => {
    if (!recommendations || recommendations.length === 0) return;
    setCreatingProjects(true);
    try {
      let headers = { 'Content-Type': 'application/json' };
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }

      for (const rec of recommendations) {
        await fetch('/api/projects', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: rec.name,
            description: rec.description,
            icon: rec.icon || '\ud83d\ude80',
            color: 'brand',
            instructions: rec.instructions || '',
            functions: rec.functions || [],
          }),
        });
      }

      unlockAchievement('project-created');
      router.push('/projects');
    } catch (err) {
      console.error('Failed to create projects:', err);
    } finally {
      setCreatingProjects(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const progress = Math.round(((questionIndex) / DISCOVERY_QUESTIONS.length) * 100);

  return (
    <div className="flex gap-6">
      {/* Chat panel */}
      <div className="flex-1 flex flex-col" style={{ minHeight: '60vh' }}>
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-dark-500 mb-1">
            <span>Discovery progress</span>
            <span>{Math.min(progress, 100)}%</span>
          </div>
          <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto bg-dark-900 border border-dark-700 rounded-xl p-4 mb-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : 'bg-dark-800 border border-dark-700 text-dark-200'
                }`}
              >
                {m.role !== 'user' && (
                  <div className="text-xs font-medium mb-1 opacity-60 uppercase">
                    Discovery Coach
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
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!isComplete || !recommendations ? (
          <div className="flex gap-3">
            <textarea
              className="flex-1 bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-dark-500"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isComplete ? 'Generating recommendations...' : 'Share your thoughts...'}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="btn-primary px-6 self-end disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        ) : (
          <button
            onClick={createAllProjects}
            disabled={creatingProjects}
            className="btn-primary w-full py-3 text-center disabled:opacity-50"
          >
            {creatingProjects
              ? 'Creating Projects...'
              : `Create These ${recommendations.length} Projects`}
          </button>
        )}
      </div>

      {/* Sidebar — opportunities/recommendations */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 sticky top-24">
          <h3 className="text-sm font-semibold text-white mb-3">
            {recommendations ? 'Recommended Projects' : 'Discovered Opportunities'}
          </h3>

          {recommendations ? (
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{rec.icon || '\ud83d\ude80'}</span>
                    <span className="text-sm font-medium text-brand-300">{rec.name}</span>
                  </div>
                  <p className="text-xs text-dark-400">{rec.description}</p>
                </div>
              ))}
            </div>
          ) : opportunities.length > 0 ? (
            <div className="space-y-2">
              {opportunities.map((opp, i) => (
                <div
                  key={i}
                  className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2"
                >
                  <p className="text-xs text-dark-300">{opp}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-dark-500">
              As you answer questions, automation opportunities will appear here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Voice Mode ─────────────────────────────────────────────────── */

function VoiceMode({ onSwitchToText }) {
  const [status, setStatus] = useState('idle'); // idle | requesting | connected | error | unsupported
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [transcript, setTranscript] = useState([]);
  const conversationRef = useRef(null);
  const [conversationHook, setConversationHook] = useState(null);

  // Dynamically import @elevenlabs/react to avoid SSR issues
  useEffect(() => {
    let cancelled = false;
    import('@elevenlabs/react').then((mod) => {
      if (!cancelled) {
        setConversationHook(() => mod.useConversation);
      }
    }).catch(() => {
      setStatus('unsupported');
      setErrorMsg('Failed to load voice library. Your browser may not be supported.');
    });
    return () => { cancelled = true; };
  }, []);

  const startSession = async () => {
    if (!conversationRef.current) {
      setErrorMsg('Voice library not loaded yet. Please wait a moment.');
      return;
    }

    setStatus('requesting');
    setErrorMsg('');

    try {
      // Request mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('error');
      setErrorMsg('Microphone permission denied. Please allow microphone access to use voice mode.');
      return;
    }

    try {
      await conversationRef.current.startSession({
        agentId: AGENT_ID,
      });
    } catch (err) {
      setStatus('error');
      setErrorMsg(`Failed to connect: ${err.message || 'Unknown error'}`);
    }
  };

  const endSession = async () => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession();
      } catch {
        // ignore
      }
    }
    setStatus('idle');
  };

  // Since useConversation is a hook, we need a wrapper component
  if (status === 'unsupported') {
    return <VoiceUnsupported message={errorMsg} onSwitchToText={onSwitchToText} />;
  }

  return (
    <VoiceSession
      onSwitchToText={onSwitchToText}
      agentId={AGENT_ID}
    />
  );
}

function VoiceSession({ onSwitchToText, agentId }) {
  const [status, setStatus] = useState('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [hookReady, setHookReady] = useState(false);
  const [useConv, setUseConv] = useState(null);

  // We cannot call a hook dynamically, so we use a different approach:
  // Render a sub-component that uses the hook once loaded.
  useEffect(() => {
    let cancelled = false;

    // Check browser support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setStatus('unsupported');
      setErrorMsg('Your browser does not support microphone access.');
      return;
    }

    import('@elevenlabs/react')
      .then((mod) => {
        if (!cancelled) {
          setUseConv(() => mod.useConversation);
          setHookReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('unsupported');
          setErrorMsg('Failed to load voice library.');
        }
      });

    return () => { cancelled = true; };
  }, []);

  if (status === 'unsupported') {
    return <VoiceUnsupported message={errorMsg} onSwitchToText={onSwitchToText} />;
  }

  if (!hookReady) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex gap-1 mb-4">
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-dark-400 text-sm">Loading voice engine...</p>
      </div>
    );
  }

  return (
    <VoiceSessionInner
      agentId={agentId}
      onSwitchToText={onSwitchToText}
      UseConversation={useConv}
    />
  );
}

function VoiceSessionInner({ agentId, onSwitchToText, UseConversation }) {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [transcript, setTranscript] = useState([]);

  const conversation = UseConversation({
    onConnect: () => {
      setStatus('connected');
      setErrorMsg('');
      unlockAchievement('first-chat');
    },
    onDisconnect: () => {
      setStatus('idle');
    },
    onMessage: (message) => {
      setTranscript((t) => [
        ...t,
        {
          role: message.source === 'user' ? 'user' : 'assistant',
          text: message.message,
        },
      ]);
    },
    onError: (error) => {
      setStatus('error');
      setErrorMsg(typeof error === 'string' ? error : error?.message || 'Connection error');
    },
  });

  const isConnected = conversation.status === 'connected';
  const speaking = conversation.isSpeaking;

  const startSession = async () => {
    setStatus('requesting');
    setErrorMsg('');

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('error');
      setErrorMsg('Microphone permission denied. Please allow microphone access in your browser settings.');
      return;
    }

    try {
      await conversation.startSession({ agentId });
    } catch (err) {
      setStatus('error');
      setErrorMsg(`Failed to connect: ${err.message || 'Unknown error'}`);
    }
  };

  const endSession = async () => {
    try {
      await conversation.endSession();
    } catch {
      // ignore
    }
    setStatus('idle');
    unlockAchievement('discovery-completed');
  };

  return (
    <div className="flex flex-col items-center">
      {/* Voice UI */}
      <div className="w-full max-w-lg mx-auto text-center py-8">
        {/* Status text */}
        <p className="text-dark-400 text-sm mb-8">
          {status === 'idle' && 'Press the microphone to start your voice discovery session'}
          {status === 'requesting' && 'Requesting microphone access...'}
          {status === 'connected' && (speaking ? 'Coach is speaking...' : 'Listening...')}
          {status === 'error' && ''}
        </p>

        {/* Mic button */}
        <div className="relative inline-flex items-center justify-center mb-8">
          {/* Pulse rings when connected */}
          {isConnected && (
            <>
              <div className="absolute inset-0 w-32 h-32 -m-4 rounded-full bg-brand-500/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 w-28 h-28 -m-2 rounded-full bg-brand-500/5 animate-ping" style={{ animationDuration: '3s' }} />
            </>
          )}

          {/* Speaking wave effect */}
          {speaking && (
            <div className="absolute inset-0 w-36 h-36 -m-6 rounded-full border-2 border-brand-400/40 animate-pulse" />
          )}

          <button
            onClick={isConnected ? endSession : startSession}
            disabled={status === 'requesting'}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
              isConnected
                ? 'bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30 text-red-400'
                : status === 'requesting'
                ? 'bg-dark-800 border-2 border-dark-600 text-dark-500 cursor-wait'
                : 'bg-brand-500/20 border-2 border-brand-500/50 hover:bg-brand-500/30 text-brand-400 hover:scale-105'
            }`}
          >
            {isConnected ? (
              // Stop icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              // Mic icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>

        {/* Waveform visualization */}
        {isConnected && (
          <div className="flex items-center justify-center gap-1 h-8 mb-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  speaking ? 'bg-brand-400' : 'bg-dark-600'
                }`}
                style={{
                  height: speaking
                    ? `${Math.random() * 24 + 8}px`
                    : '4px',
                  animationDelay: `${i * 50}ms`,
                  transition: 'height 150ms ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6 max-w-md mx-auto">
            {errorMsg}
          </div>
        )}

        {/* Switch to text */}
        <button
          onClick={onSwitchToText}
          className="text-sm text-dark-500 hover:text-dark-300 transition-colors"
        >
          Switch to text mode
        </button>
      </div>

      {/* Transcript */}
      {transcript.length > 0 && (
        <div className="w-full max-w-lg mx-auto mt-4">
          <h3 className="text-sm font-medium text-dark-400 mb-3">Transcript</h3>
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 space-y-3 max-h-64 overflow-y-auto">
            {transcript.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-brand-600/80 text-white'
                      : 'bg-dark-800 text-dark-300'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VoiceUnsupported({ message, onSwitchToText }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto text-center">
      <div className="w-16 h-16 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Voice Not Available</h3>
      <p className="text-dark-400 text-sm mb-6">
        {message || 'Your browser does not support voice conversations. Please use a modern browser with microphone support.'}
      </p>
      <button onClick={onSwitchToText} className="btn-primary">
        Use Text Mode Instead
      </button>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function extractOpportunity(text) {
  const lower = text.toLowerCase();
  if (lower.includes('email') || lower.includes('inbox'))
    return 'Email automation opportunity detected';
  if (lower.includes('report') || lower.includes('summary'))
    return 'Recurring report generation possible';
  if (lower.includes('schedule') || lower.includes('calendar'))
    return 'Scheduling automation detected';
  if (lower.includes('slack') || lower.includes('teams'))
    return 'Messaging integration opportunity';
  if (lower.includes('code') || lower.includes('github') || lower.includes('deploy'))
    return 'DevOps automation potential';
  if (lower.includes('meeting') || lower.includes('notes'))
    return 'Meeting notes automation possible';
  if (lower.includes('client') || lower.includes('customer'))
    return 'Client management automation';
  if (lower.includes('social') || lower.includes('content') || lower.includes('post'))
    return 'Content/social media automation';
  return null;
}
