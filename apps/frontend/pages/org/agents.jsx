import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import { Users, UserPlus, Shield, Bot, ToggleLeft, ToggleRight, AlertCircle, Loader2 } from 'lucide-react';

export default function OrgAgents() {
  const router = useRouter();
  const { user, supabase } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Provision modal state
  const [showProvision, setShowProvision] = useState(false);
  const [provEmployeeId, setProvEmployeeId] = useState('');
  const [provEmployeeName, setProvEmployeeName] = useState('');
  const [provRoleDesc, setProvRoleDesc] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [provError, setProvError] = useState(null);

  // Toggle in-progress tracking
  const [togglingId, setTogglingId] = useState(null);

  const getAuthHeaders = useCallback(async () => {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }, [supabase]);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (!showAll) params.set('activeOnly', 'true');
      const resp = await fetch(`/api/org/agents?${params.toString()}`, { headers });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setAgents(data.agents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showAll]);

  useEffect(() => {
    if (user) fetchAgents();
    else setLoading(false);
  }, [user, fetchAgents]);

  const provisionAgentPair = async () => {
    if (!provEmployeeId.trim()) return;
    setProvisioning(true);
    setProvError(null);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      const resp = await fetch('/api/org/agents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          employeeUserId: provEmployeeId.trim(),
          employeeName: provEmployeeName.trim() || undefined,
          roleDescription: provRoleDesc.trim() || undefined,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      setShowProvision(false);
      setProvEmployeeId('');
      setProvEmployeeName('');
      setProvRoleDesc('');
      fetchAgents();
    } catch (err) {
      setProvError(err.message);
    } finally {
      setProvisioning(false);
    }
  };

  const toggleAgent = async (agent) => {
    setTogglingId(agent.id);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      // Deactivate = DELETE, reactivate = POST with same employee
      if (agent.active) {
        await fetch('/api/org/agents', {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ employeeUserId: agent.employee_user_id }),
        });
      } else {
        await fetch('/api/org/agents', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            employeeUserId: agent.employee_user_id,
            employeeName: agent.employee_name || undefined,
          }),
        });
      }
      fetchAgents();
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setTogglingId(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Organisation Agents</h1>
        <p className="text-dark-300 mb-8">Sign in to manage your organisation's agents.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Organisation Agents</h1>
            <p className="text-dark-400 mt-1">
              Manage AI assistant and coach agents for your employees.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowProvision(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Provision Agent Pair
        </button>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="rounded bg-dark-800 border-dark-600 text-brand-500 focus:ring-brand-500"
          />
          Show inactive agents
        </label>
        <span className="text-dark-500 text-sm">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Provision Modal */}
      {showProvision && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowProvision(false)}>
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand-400" />
              Provision Agent Pair
            </h2>
            <p className="text-dark-400 text-sm mb-4">
              This will create an assistant and coach agent pair for the specified employee.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1">Employee User ID *</label>
                <input
                  type="text"
                  value={provEmployeeId}
                  onChange={(e) => setProvEmployeeId(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                  placeholder="UUID of the employee"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">Employee Name</label>
                <input
                  type="text"
                  value={provEmployeeName}
                  onChange={(e) => setProvEmployeeName(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">Role Description</label>
                <textarea
                  value={provRoleDesc}
                  onChange={(e) => setProvRoleDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Senior Account Manager, handles enterprise clients"
                />
              </div>
            </div>

            {provError && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {provError}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={provisionAgentPair}
                disabled={!provEmployeeId.trim() || provisioning}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {provisioning && <Loader2 className="w-4 h-4 animate-spin" />}
                {provisioning ? 'Provisioning...' : 'Provision'}
              </button>
              <button onClick={() => setShowProvision(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-medium">Failed to load agents</div>
            <div className="text-sm opacity-80">{error}</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
          <p className="text-dark-400">Loading agents...</p>
        </div>
      ) : agents.length === 0 ? (
        /* Empty State */
        <div className="card text-center py-16">
          <Bot className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <p className="text-dark-300 text-lg mb-2">No agents provisioned</p>
          <p className="text-dark-500 text-sm mb-6">
            Provision an agent pair to get started with AI-assisted workflows for your team.
          </p>
          <button
            onClick={() => setShowProvision(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Provision Agent Pair
          </button>
        </div>
      ) : (
        /* Agent Table */
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left px-4 py-3 text-dark-400 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 text-dark-400 font-medium">Agent Role</th>
                  <th className="text-left px-4 py-3 text-dark-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-dark-400 font-medium">Created</th>
                  <th className="text-right px-4 py-3 text-dark-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">
                        {agent.employee_name || 'Unknown'}
                      </div>
                      <div className="text-dark-500 text-xs">
                        {agent.employee_user_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        agent.agent_role === 'assistant'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {agent.agent_role === 'assistant' ? (
                          <Bot className="w-3 h-3" />
                        ) : (
                          <Shield className="w-3 h-3" />
                        )}
                        {agent.agent_role === 'assistant' ? 'Assistant' : 'Coach'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        agent.active
                          ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                          : 'bg-dark-700 text-dark-400 border border-dark-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          agent.active ? 'bg-brand-400' : 'bg-dark-500'
                        }`} />
                        {agent.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dark-400">
                      {agent.created_at
                        ? new Date(agent.created_at).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleAgent(agent)}
                        disabled={togglingId === agent.id}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          agent.active
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'text-brand-400 hover:bg-brand-500/10'
                        } disabled:opacity-40`}
                      >
                        {togglingId === agent.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : agent.active ? (
                          <ToggleRight className="w-3.5 h-3.5" />
                        ) : (
                          <ToggleLeft className="w-3.5 h-3.5" />
                        )}
                        {agent.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
