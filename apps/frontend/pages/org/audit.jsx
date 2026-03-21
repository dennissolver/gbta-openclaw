import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import {
  ScrollText, Filter, ChevronDown, ChevronRight, AlertCircle, Loader2, Search, X,
} from 'lucide-react';

const ACTION_TYPES = [
  'agent.message',
  'agent.tool_call',
  'agent.delegation',
  'consent.granted',
  'consent.revoked',
  'data.access',
  'data.export',
  'admin.provision',
  'admin.deprovision',
];

export default function OrgAudit() {
  const { user, supabase } = useAuth();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [filterAgent, setFilterAgent] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Expanded detail rows
  const [expandedIds, setExpandedIds] = useState(new Set());

  const PAGE_SIZE = 50;

  const getAuthHeaders = useCallback(async () => {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  }, [supabase]);

  const buildQueryParams = useCallback((limit, offset) => {
    const params = new URLSearchParams();
    params.set('limit', String(limit || PAGE_SIZE));
    if (filterAgent) params.set('agentId', filterAgent);
    if (filterUser) params.set('userId', filterUser);
    if (filterAction) params.set('action', filterAction);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    return params.toString();
  }, [filterAgent, filterUser, filterAction, filterFrom, filterTo]);

  const fetchEntries = useCallback(async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const qs = buildQueryParams(PAGE_SIZE);
      const resp = await fetch(`/api/org/audit?${qs}`, { headers });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const fetched = data.entries || [];
      setEntries(fetched);
      setHasMore(fetched.length >= PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getAuthHeaders, buildQueryParams]);

  useEffect(() => {
    if (user) fetchEntries();
    else setLoading(false);
  }, [user, fetchEntries]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setFilterAgent('');
    setFilterUser('');
    setFilterAction('');
    setFilterFrom('');
    setFilterTo('');
  };

  const hasActiveFilters = filterAgent || filterUser || filterAction || filterFrom || filterTo;

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Audit Log</h1>
        <p className="text-dark-300 mb-8">Sign in to view the organisation audit log.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Audit Log</h1>
            <p className="text-dark-400 mt-1">
              Track all agent actions, data access, and consent changes.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 ${hasActiveFilters ? 'border-brand-500/50 text-brand-400' : ''}`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-brand-400" />
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Filters</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-dark-400 hover:text-brand-400 flex items-center gap-1">
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Agent ID</label>
              <input
                type="text"
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                placeholder="Agent UUID"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">User ID</label>
              <input
                type="text"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                placeholder="User UUID"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Action Type</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="">All actions</option>
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">From</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">To</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => fetchEntries()} className="btn-primary flex items-center gap-2 text-sm">
              <Search className="w-4 h-4" />
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-medium">Failed to load audit log</div>
            <div className="text-sm opacity-80">{error}</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
          <p className="text-dark-400">Loading audit entries...</p>
        </div>
      ) : entries.length === 0 ? (
        /* Empty State */
        <div className="card text-center py-16">
          <ScrollText className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <p className="text-dark-300 text-lg mb-2">No audit entries found</p>
          <p className="text-dark-500 text-sm">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results.'
              : 'Audit entries will appear here as agents perform actions.'}
          </p>
        </div>
      ) : (
        <>
          {/* Audit Table */}
          <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="w-8 px-3 py-3" />
                    <th className="text-left px-4 py-3 text-dark-400 font-medium">Timestamp</th>
                    <th className="text-left px-4 py-3 text-dark-400 font-medium">Agent</th>
                    <th className="text-left px-4 py-3 text-dark-400 font-medium">User</th>
                    <th className="text-left px-4 py-3 text-dark-400 font-medium">Action</th>
                    <th className="text-left px-4 py-3 text-dark-400 font-medium">Resource</th>
                    <th className="text-right px-4 py-3 text-dark-400 font-medium">Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {entries.map((entry, idx) => {
                    const entryId = entry.id || idx;
                    const isExpanded = expandedIds.has(entryId);
                    return (
                      <React.Fragment key={entryId}>
                        <tr
                          className="hover:bg-dark-800/50 transition-colors cursor-pointer"
                          onClick={() => toggleExpanded(entryId)}
                        >
                          <td className="px-3 py-3 text-dark-500">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-dark-300 whitespace-nowrap">
                            {entry.created_at || entry.timestamp
                              ? new Date(entry.created_at || entry.timestamp).toLocaleString('en-AU', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : '--'}
                          </td>
                          <td className="px-4 py-3 text-dark-400 font-mono text-xs">
                            {entry.agent_id
                              ? `${entry.agent_id.slice(0, 8)}...`
                              : '--'}
                          </td>
                          <td className="px-4 py-3 text-dark-400 font-mono text-xs">
                            {entry.user_id
                              ? `${entry.user_id.slice(0, 8)}...`
                              : '--'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-dark-800 text-dark-300 border border-dark-700">
                              {entry.action || '--'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-dark-400 text-xs">
                            {entry.resource || '--'}
                          </td>
                          <td className="px-4 py-3 text-right text-dark-400 tabular-nums">
                            {entry.tokens_used != null ? entry.tokens_used.toLocaleString() : '--'}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-dark-800/30">
                            <td colSpan={7} className="px-8 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-dark-500 uppercase tracking-wide">Full Agent ID</span>
                                  <p className="text-dark-300 font-mono mt-1">{entry.agent_id || '--'}</p>
                                </div>
                                <div>
                                  <span className="text-dark-500 uppercase tracking-wide">Full User ID</span>
                                  <p className="text-dark-300 font-mono mt-1">{entry.user_id || '--'}</p>
                                </div>
                                {entry.detail && (
                                  <div className="md:col-span-2">
                                    <span className="text-dark-500 uppercase tracking-wide">Detail</span>
                                    <pre className="text-dark-300 mt-1 whitespace-pre-wrap bg-dark-900 rounded-lg p-3 border border-dark-700 max-h-48 overflow-y-auto">
                                      {typeof entry.detail === 'string'
                                        ? entry.detail
                                        : JSON.stringify(entry.detail, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {entry.metadata && (
                                  <div className="md:col-span-2">
                                    <span className="text-dark-500 uppercase tracking-wide">Metadata</span>
                                    <pre className="text-dark-300 mt-1 whitespace-pre-wrap bg-dark-900 rounded-lg p-3 border border-dark-700 max-h-48 overflow-y-auto">
                                      {JSON.stringify(entry.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => fetchEntries()}
                disabled={loadingMore}
                className="btn-secondary inline-flex items-center gap-2 disabled:opacity-40"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
