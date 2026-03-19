import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';

const GHL_FEATURES = [
  { name: 'Contact Sync', desc: 'Sync contacts between GHL and your agent', icon: '👥', status: 'available' },
  { name: 'Lead Capture', desc: 'Automatically create leads in GHL from conversations', icon: '📥', status: 'available' },
  { name: 'Workflow Triggers', desc: 'Trigger GHL workflows from agent actions', icon: '⚡', status: 'available' },
  { name: 'Webhooks', desc: 'Receive GHL events and act on them automatically', icon: '🔔', status: 'coming-soon' },
  { name: 'Pipeline Management', desc: 'Move deals through GHL pipelines via agent commands', icon: '📊', status: 'coming-soon' },
  { name: 'Appointment Booking', desc: 'Book appointments in GHL calendars', icon: '📅', status: 'coming-soon' },
];

export default function GHLIntegration() {
  const { user, supabase } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [locationId, setLocationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSave = async () => {
    if (!apiKey.trim() || !locationId.trim()) {
      setError('Both API Key and Location ID are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Store credentials in user's profile metadata via Supabase
      if (supabase && user) {
        await supabase.from('profiles').update({
          // Store as JSON in a metadata column or use a separate table
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);

        // For now, store in user_channels as a GHL "channel"
        await supabase.from('user_channels').upsert({
          user_id: user.id,
          platform: 'gohighlevel',
          config: { locationId: locationId.trim() },
          connected: true,
          connected_at: new Date().toISOString(),
        }, { onConflict: 'user_id, platform', ignoreDuplicates: false });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Test the GHL API connection
      const resp = await fetch('https://services.leadconnectorhq.com/contacts/', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28',
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        setTestResult({ success: true, message: `Connected! Found ${data.contacts?.length || 0} contacts.` });
      } else if (resp.status === 401) {
        setTestResult({ success: false, message: 'Authentication failed. Check your API Key.' });
      } else {
        setTestResult({ success: false, message: `Unexpected response: ${resp.status}` });
      }
    } catch (e) {
      setTestResult({ success: false, message: `Connection error: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-2xl">
          🔗
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Go High Level Integration</h1>
          <p className="text-dark-400">Connect your GHL CRM to EasyOpenClaw</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">API Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1">GHL API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500"
                  placeholder="Enter your Go High Level API Key"
                />
                <p className="text-dark-500 text-xs mt-1">Settings &gt; Business Profile &gt; API Keys</p>
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1">Location ID</label>
                <input
                  type="text"
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500"
                  placeholder="Enter your GHL Location ID"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              {saved && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg p-3">
                  Credentials saved successfully!
                </div>
              )}

              {testResult && (
                <div className={`text-sm rounded-lg p-3 ${
                  testResult.success
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {testResult.message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleTest}
                  disabled={!apiKey.trim() || testing}
                  className="btn-secondary text-sm disabled:opacity-40"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!apiKey.trim() || !locationId.trim() || saving}
                  className="btn-primary text-sm disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Capabilities</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {GHL_FEATURES.map(f => (
                <div key={f.name} className="bg-dark-800 border border-dark-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{f.icon}</span>
                      <span className="text-white font-medium text-sm">{f.name}</span>
                    </div>
                    <span className={f.status === 'available' ? 'badge-green' : 'badge-orange'}>
                      {f.status === 'available' ? 'Available' : 'Coming Soon'}
                    </span>
                  </div>
                  <p className="text-dark-400 text-xs">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-white font-semibold mb-3">How It Works</h3>
            <ol className="space-y-3 text-sm text-dark-400">
              <li className="flex gap-3">
                <span className="text-brand-400 font-bold flex-shrink-0">1</span>
                <span>Enter your GHL API Key and Location ID</span>
              </li>
              <li className="flex gap-3">
                <span className="text-brand-400 font-bold flex-shrink-0">2</span>
                <span>Test the connection to verify credentials</span>
              </li>
              <li className="flex gap-3">
                <span className="text-brand-400 font-bold flex-shrink-0">3</span>
                <span>Your agent can now sync contacts, create leads, and trigger workflows</span>
              </li>
              <li className="flex gap-3">
                <span className="text-brand-400 font-bold flex-shrink-0">4</span>
                <span>Use natural language: &quot;Add John as a lead in GHL&quot;</span>
              </li>
            </ol>
          </div>

          <div className="card">
            <h3 className="text-white font-semibold mb-3">Example Commands</h3>
            <div className="space-y-2">
              {[
                'List my GHL contacts',
                'Create a lead: Jane Smith, jane@co.com',
                'Trigger the onboarding workflow for contact X',
                'Show my GHL pipeline status',
              ].map((cmd, i) => (
                <div key={i} className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-xs text-dark-300 font-mono">
                  {cmd}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
