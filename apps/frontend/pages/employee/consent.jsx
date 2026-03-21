import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import {
  ShieldCheck, Eye, Mail, Users, Brain, ListTodo, AlertCircle, Loader2, Check, X,
} from 'lucide-react';

const CONSENT_META = {
  activity_tracking: {
    icon: Eye,
    title: 'Activity Tracking',
    description: 'Allow your AI assistant to observe your app usage and task activity.',
    color: 'blue',
  },
  email_access: {
    icon: Mail,
    title: 'Email Access',
    description: 'Allow your AI assistant to read email summaries for context.',
    color: 'purple',
  },
  crm_access: {
    icon: Users,
    title: 'CRM Access',
    description: 'Allow your AI assistant to view CRM contacts and deals.',
    color: 'orange',
  },
  coaching: {
    icon: Brain,
    title: 'Coaching',
    description: 'Allow the AI coach to review your work patterns and provide suggestions.',
    color: 'brand',
  },
  task_delegation: {
    icon: ListTodo,
    title: 'Task Delegation',
    description: 'Allow AI to suggest and execute task delegations.',
    color: 'blue',
  },
};

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
  },
  brand: {
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20',
    text: 'text-brand-400',
  },
};

export default function EmployeeConsent() {
  const { user, supabase } = useAuth();
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingType, setTogglingType] = useState(null);

  const getAuthHeaders = useCallback(async () => {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }, [supabase]);

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/employee/consent', { headers });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setConsents(data.consents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (user) fetchConsents();
    else setLoading(false);
  }, [user, fetchConsents]);

  const toggleConsent = async (consentType, currentlyGranted) => {
    setTogglingType(consentType);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      const resp = await fetch('/api/employee/consent', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          consentType,
          granted: !currentlyGranted,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      // Refresh the full list to get updated timestamps
      await fetchConsents();
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingType(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Consent Settings</h1>
        <p className="text-dark-300 mb-8">Sign in to manage your consent preferences.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Consent Settings</h1>
        </div>
      </div>
      <p className="text-dark-400 mb-8 ml-[52px]">
        Control what data your AI assistant and coach can access. You can change these at any time.
        Revoking consent immediately stops data access.
      </p>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-medium">Error</div>
            <div className="text-sm opacity-80">{error}</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
          <p className="text-dark-400">Loading consent settings...</p>
        </div>
      ) : consents.length === 0 ? (
        <div className="card text-center py-16">
          <ShieldCheck className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <p className="text-dark-300 text-lg mb-2">No consent types configured</p>
          <p className="text-dark-500 text-sm">
            Consent options will appear here once your organisation has provisioned AI agents.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {consents.map((consent) => {
            const meta = CONSENT_META[consent.consent_type] || {
              icon: ShieldCheck,
              title: consent.consent_type,
              description: consent.description?.description || '',
              color: 'brand',
            };
            const Icon = meta.icon;
            const colors = COLOR_CLASSES[meta.color] || COLOR_CLASSES.brand;
            const isToggling = togglingType === consent.consent_type;

            return (
              <div
                key={consent.consent_type}
                className={`bg-dark-900 border rounded-xl p-5 transition-all ${
                  consent.granted
                    ? 'border-brand-500/30'
                    : 'border-dark-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-white font-semibold">{meta.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          consent.granted
                            ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                            : 'bg-dark-700 text-dark-400 border border-dark-600'
                        }`}>
                          {consent.granted ? (
                            <><Check className="w-3 h-3" /> Granted</>
                          ) : (
                            <><X className="w-3 h-3" /> Revoked</>
                          )}
                        </span>
                      </div>
                      <p className="text-dark-400 text-sm mb-2">{meta.description}</p>

                      {/* Data accessed list from API description */}
                      {consent.description?.data_accessed && (
                        <div className="mb-2">
                          <p className="text-dark-500 text-xs uppercase tracking-wide mb-1">Data accessed:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {consent.description.data_accessed.map((item) => (
                              <span
                                key={item}
                                className="text-xs px-2 py-0.5 rounded bg-dark-800 text-dark-400 border border-dark-700"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="text-xs text-dark-500 mt-2 space-y-0.5">
                        {consent.granted && consent.granted_at && (
                          <p>Granted: {formatDate(consent.granted_at)}</p>
                        )}
                        {!consent.granted && consent.revoked_at && (
                          <p>Revoked: {formatDate(consent.revoked_at)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => toggleConsent(consent.consent_type, consent.granted)}
                    disabled={isToggling}
                    className="flex-shrink-0 mt-1"
                    aria-label={consent.granted ? `Revoke ${meta.title}` : `Grant ${meta.title}`}
                  >
                    {isToggling ? (
                      <Loader2 className="w-10 h-6 text-dark-400 animate-spin" />
                    ) : (
                      <div
                        className={`relative w-12 h-7 rounded-full transition-colors ${
                          consent.granted ? 'bg-brand-500' : 'bg-dark-600'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                            consent.granted ? 'translate-x-[22px]' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Privacy Notice */}
      {consents.length > 0 && (
        <div className="mt-8 p-4 rounded-xl bg-dark-900 border border-dark-700">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-dark-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-dark-400 leading-relaxed">
              <p className="font-medium text-dark-300 mb-1">Your Privacy</p>
              <p>
                All consent changes are logged in the organisation audit trail. Revoking consent
                immediately prevents any further data access of that type. Previously accessed data
                may be retained per your organisation's data retention policy. Contact your
                administrator for data deletion requests.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
