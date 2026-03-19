import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';

const STEPS = ['auth', 'risk', 'ai-tier', 'channels', 'skills', 'provisioning'];

const AI_TIERS = [
  {
    id: 'fast',
    name: 'Fast',
    desc: 'Quick responses for simple tasks. Best for chat, lookups, and basic automation.',
    model: 'Haiku-class',
    cost: 'Lowest cost',
    color: 'border-blue-500/50 bg-blue-500/5',
    badge: 'badge-blue',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    desc: 'Great all-rounder. Handles complex tasks, writing, analysis, and code well.',
    model: 'Sonnet-class',
    cost: 'Moderate cost',
    color: 'border-brand-500/50 bg-brand-500/5',
    badge: 'badge-green',
    recommended: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    desc: 'Maximum capability. Best for research, strategy, complex reasoning, and agentic workflows.',
    model: 'Opus-class',
    cost: 'Higher cost',
    color: 'border-purple-500/50 bg-purple-500/5',
    badge: 'badge-purple',
  },
];

const CHANNELS = [
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬', desc: 'Connect via QR code scan' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', desc: 'Connect via @BotFather token' },
  { id: 'slack', name: 'Slack', icon: '💼', desc: 'Connect your Slack workspace' },
  { id: 'discord', name: 'Discord', icon: '🎮', desc: 'Add bot to your Discord server' },
  { id: 'teams', name: 'Microsoft Teams', icon: '🏢', desc: 'Connect your Teams org' },
  { id: 'email', name: 'Email (IMAP)', icon: '📧', desc: 'Connect your email inbox' },
  { id: 'signal', name: 'Signal', icon: '🔒', desc: 'Privacy-focused messaging' },
];

const SKILL_BUNDLES = [
  { id: 'email-manager', name: 'Email Manager', desc: 'Process, organize, and auto-reply to emails', icon: '📧' },
  { id: 'dev-tools', name: 'Developer Tools', desc: 'GitHub PRs, CI/CD, code review, deploy monitoring', icon: '💻' },
  { id: 'business-ops', name: 'Business Operations', desc: 'Invoices, reports, client onboarding, CRM sync', icon: '📊' },
  { id: 'calendar-scheduler', name: 'Calendar & Scheduling', desc: 'Manage events, book meetings, send invites', icon: '📅' },
  { id: 'content-marketing', name: 'Content & Marketing', desc: 'Draft posts, schedule publishing, social management', icon: '📝' },
  { id: 'smart-home', name: 'Smart Home', desc: 'HomeAssistant integration, device control, automation', icon: '🏠' },
  { id: 'research', name: 'Research & Knowledge', desc: 'Web search, document summarization, competitive intel', icon: '🔍' },
  { id: 'data-analysis', name: 'Data Analysis', desc: 'Spreadsheet processing, charts, trend analysis', icon: '📈' },
];

export default function Onboarding() {
  const router = useRouter();
  const { user, profile, signUp, signIn, updateProfile, supabase, loading } = useAuth();
  const [step, setStep] = useState(0);

  // Auth form state
  const [authMode, setAuthMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Onboarding state
  const [aiTier, setAiTier] = useState('balanced');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState(['email-manager', 'research']);
  const [provisioningStatus, setProvisioningStatus] = useState('idle'); // idle, provisioning, done, error
  const [provisioningError, setProvisioningError] = useState('');

  // Skip to correct step based on auth/onboarding state (only on initial load)
  const initialStepSet = useRef(false);
  useEffect(() => {
    if (loading || initialStepSet.current) return;
    if (user && profile?.onboarding_completed) {
      router.replace('/workspace');
    } else if (user && profile) {
      initialStepSet.current = true;
      if (profile.risk_accepted) {
        setStep(2); // skip to AI tier
      } else {
        setStep(1); // risk step
      }
    } else if (user) {
      initialStepSet.current = true;
      setStep(1); // logged in but no profile yet
    }
  }, [user, profile, loading]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
      setStep(1);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRiskAccept = async () => {
    try {
      await updateProfile({
        risk_accepted: true,
        risk_accepted_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Profile update failed (non-blocking):', e);
    }
    setStep(2);
  };

  const handleAiTier = async () => {
    try {
      await updateProfile({ ai_tier: aiTier });
    } catch (e) {
      console.warn('Profile update failed (non-blocking):', e);
    }
    setStep(3);
  };

  const handleChannels = async () => {
    try {
      if (supabase && user) {
        for (const ch of selectedChannels) {
          await supabase.from('user_channels').upsert({
            user_id: user.id,
            platform: ch,
            connected: false,
          }, { onConflict: 'user_id, platform', ignoreDuplicates: true });
        }
      }
    } catch (e) {
      console.warn('Channel save failed (non-blocking):', e);
    }
    setStep(4);
  };

  const handleSkills = async () => {
    try {
      if (supabase && user) {
        for (const skill of selectedSkills) {
          await supabase.from('user_skills').upsert({
            user_id: user.id,
            skill_bundle: skill,
            enabled: true,
          }, { onConflict: 'user_id, skill_bundle', ignoreDuplicates: true });
        }
      }
    } catch (e) {
      console.warn('Skills save failed (non-blocking):', e);
    }
    // Agent is auto-provisioned via DB trigger — just mark onboarding complete and redirect
    try {
      await updateProfile({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Profile update failed (non-blocking):', e);
    }
    router.push('/workspace');
  };

  const provisionAgent = async () => {
    setProvisioningStatus('provisioning');
    setProvisioningError('');
    try {
      // Get the current session token to authenticate the API call
      let authHeaders = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      const resp = await fetch('/api/provision-agent', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || data.detail || 'Provisioning failed');
      }
      setProvisioningStatus('done');
      // Mark onboarding as complete
      try {
        await updateProfile({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Profile update failed (non-blocking):', e);
      }
      // Brief pause to show success, then redirect
      setTimeout(() => {
        router.push('/workspace');
      }, 1500);
    } catch (err) {
      console.error('Agent provisioning failed:', err);
      setProvisioningStatus('error');
      setProvisioningError(err.message);
    }
  };

  const toggleChannel = (id) => {
    setSelectedChannels(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleSkill = (id) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const currentStep = STEPS[step];

  // No layout wrapper for onboarding
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-400 text-sm">Step {step + 1} of {STEPS.length}</span>
            <span className="text-dark-500 text-sm capitalize">{currentStep.replace('-', ' ')}</span>
          </div>
          <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-500 rounded-full"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 0: Auth */}
        {currentStep === 'auth' && (
          <div className="card">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">EO</div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome to EasyOpenClaw</h1>
              <p className="text-dark-400">Your autonomous AI agent, wrapped by Corporate AI Solutions</p>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${authMode === 'signup' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white'}`}
              >
                Create Account
              </button>
              <button
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${authMode === 'signin' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white'}`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    placeholder="Your name"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {authLoading ? 'Please wait...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* Step 1: Risk Acknowledgment */}
        {currentStep === 'risk' && (
          <div className="card">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⚠️</div>
              <h1 className="text-2xl font-bold text-white mb-2">Important: Agent Permissions</h1>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-lg p-5 mb-6 space-y-4 text-sm text-dark-300 leading-relaxed">
              <p>
                <strong className="text-white">EasyOpenClaw is an autonomous AI agent wrapper</strong> (powered by OpenClaw) that can take real-world actions on your behalf, including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Sending messages through your connected platforms</li>
                <li>Reading and processing your emails</li>
                <li>Executing commands on connected systems</li>
                <li>Creating, modifying, and deleting files</li>
                <li>Making API calls to external services</li>
              </ul>
              <p>
                <strong className="text-white">Safety measures are in place:</strong> sensitive actions require your explicit confirmation,
                all actions are logged, and you can revoke permissions at any time.
              </p>
              <p>
                <strong className="text-white">Your data stays on Corporate AI Solutions infrastructure.</strong> No data is shared with third parties
                except the AI providers you select. Corporate AI Solutions manages infrastructure security and compliance.
              </p>
            </div>

            <label className="flex items-start gap-3 mb-6 cursor-pointer group">
              <input
                type="checkbox"
                id="risk-accept"
                className="mt-1 w-4 h-4 rounded border-dark-500 bg-dark-800 text-brand-500 focus:ring-brand-500"
                onChange={() => {}}
              />
              <span className="text-sm text-dark-300 group-hover:text-white transition-colors">
                I understand that EasyOpenClaw can take actions on my behalf through connected platforms,
                and I accept responsibility for configuring appropriate permissions and reviewing agent actions.
              </span>
            </label>

            <button
              onClick={handleRiskAccept}
              className="btn-primary w-full"
            >
              I Understand — Continue
            </button>
          </div>
        )}

        {/* Step 2: AI Tier */}
        {currentStep === 'ai-tier' && (
          <div className="card">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Choose Your AI Tier</h1>
              <p className="text-dark-400">Select the intelligence level for your agent. You can change this anytime.</p>
            </div>

            <div className="space-y-3 mb-8">
              {AI_TIERS.map(tier => (
                <button
                  key={tier.id}
                  onClick={() => setAiTier(tier.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    aiTier === tier.id
                      ? tier.color + ' ring-1 ring-offset-1 ring-offset-dark-900'
                      : 'border-dark-700 bg-dark-800 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold text-lg">{tier.name}</span>
                      <span className={tier.badge}>{tier.model}</span>
                      {tier.recommended && <span className="badge-green">Recommended</span>}
                    </div>
                    <span className="text-dark-400 text-sm">{tier.cost}</span>
                  </div>
                  <p className="text-dark-400 text-sm">{tier.desc}</p>
                </button>
              ))}
            </div>

            <button onClick={handleAiTier} className="btn-primary w-full">
              Continue with {AI_TIERS.find(t => t.id === aiTier)?.name}
            </button>
          </div>
        )}

        {/* Step 3: Channels */}
        {currentStep === 'channels' && (
          <div className="card">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Connect Your Channels</h1>
              <p className="text-dark-400">Choose which messaging platforms to connect. You can add more later.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedChannels.includes(ch.id)
                      ? 'border-brand-500/50 bg-brand-500/5'
                      : 'border-dark-700 bg-dark-800 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{ch.icon}</span>
                    <span className="text-white font-medium">{ch.name}</span>
                  </div>
                  <p className="text-dark-500 text-xs ml-11">{ch.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setSelectedChannels([]); handleChannels(); }} className="btn-secondary flex-1">
                Skip for Now
              </button>
              <button onClick={handleChannels} className="btn-primary flex-1">
                Continue{selectedChannels.length > 0 && ` (${selectedChannels.length} selected)`}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Skills */}
        {currentStep === 'skills' && (
          <div className="card">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Choose Starter Skills</h1>
              <p className="text-dark-400">Pre-install skill bundles for your most common tasks. Add or remove anytime.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {SKILL_BUNDLES.map(skill => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedSkills.includes(skill.id)
                      ? 'border-brand-500/50 bg-brand-500/5'
                      : 'border-dark-700 bg-dark-800 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{skill.icon}</span>
                    <span className="text-white font-medium">{skill.name}</span>
                  </div>
                  <p className="text-dark-500 text-xs ml-11">{skill.desc}</p>
                </button>
              ))}
            </div>

            <button onClick={handleSkills} className="btn-primary w-full">
              Launch My Agent{selectedSkills.length > 0 && ` (${selectedSkills.length} skills)`}
            </button>
          </div>
        )}

        {/* Step 5: Provisioning */}
        {currentStep === 'provisioning' && (
          <div className="card text-center py-12">
            {provisioningStatus === 'provisioning' && (
              <>
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Setting Up Your Agent...</h1>
                <p className="text-dark-400">
                  We're provisioning a dedicated AI agent on our infrastructure. This takes a few seconds.
                </p>
              </>
            )}

            {provisioningStatus === 'done' && (
              <>
                <div className="text-5xl mb-4">&#10003;</div>
                <h1 className="text-2xl font-bold text-white mb-2">Agent Ready!</h1>
                <p className="text-dark-400">
                  Your personal EasyOpenClaw agent has been provisioned. Redirecting to workspace...
                </p>
              </>
            )}

            {provisioningStatus === 'error' && (
              <>
                <div className="text-5xl mb-4">&#9888;</div>
                <h1 className="text-2xl font-bold text-white mb-2">Provisioning Issue</h1>
                <p className="text-dark-400 mb-4">
                  {provisioningError || 'Something went wrong while setting up your agent.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={provisionAgent} className="btn-primary">
                    Retry
                  </button>
                  <button
                    onClick={() => {
                      updateProfile({
                        onboarding_completed: true,
                        onboarding_completed_at: new Date().toISOString(),
                      }).catch(() => {});
                      router.push('/workspace');
                    }}
                    className="btn-secondary"
                  >
                    Skip for Now
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// No layout for onboarding — standalone page
Onboarding.getLayout = (page) => page;
