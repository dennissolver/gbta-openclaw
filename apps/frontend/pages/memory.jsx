import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function Memory() {
  const { user } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedFile, setExpandedFile] = useState(null);

  useEffect(() => {
    fetchMemories();
  }, [user]);

  async function fetchMemories() {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/agent-memory');
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.status === 'agent_not_provisioned') {
        setMemories([]);
        setError('agent_not_provisioned');
      } else {
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error('Failed to fetch memories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return memories;
    const q = search.toLowerCase();
    return memories.filter(m =>
      m.filename.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q)
    );
  }, [memories, search]);

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  // Simple markdown-ish rendering: headings, bold, code blocks, lists
  function renderMarkdown(text) {
    if (!text) return null;

    const lines = text.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeLines = [];
    let key = 0;

    for (const line of lines) {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={key++} className="bg-dark-950 border border-dark-700 rounded-lg p-3 my-2 text-sm text-dark-200 overflow-x-auto">
              <code>{codeLines.join('\n')}</code>
            </pre>
          );
          codeLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      if (line.startsWith('# ')) {
        elements.push(<h2 key={key++} className="text-lg font-bold text-white mt-3 mb-1">{line.slice(2)}</h2>);
      } else if (line.startsWith('## ')) {
        elements.push(<h3 key={key++} className="text-base font-semibold text-white mt-2 mb-1">{line.slice(3)}</h3>);
      } else if (line.startsWith('### ')) {
        elements.push(<h4 key={key++} className="text-sm font-semibold text-dark-200 mt-2 mb-1">{line.slice(4)}</h4>);
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <div key={key++} className="flex gap-2 text-sm text-dark-300 ml-2">
            <span className="text-dark-500 flex-shrink-0">&bull;</span>
            <span>{renderInlineMarkdown(line.slice(2))}</span>
          </div>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={key++} className="h-2" />);
      } else {
        elements.push(<p key={key++} className="text-sm text-dark-300 leading-relaxed">{renderInlineMarkdown(line)}</p>);
      }
    }

    // Close unclosed code block
    if (inCodeBlock && codeLines.length > 0) {
      elements.push(
        <pre key={key++} className="bg-dark-950 border border-dark-700 rounded-lg p-3 my-2 text-sm text-dark-200 overflow-x-auto">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
    }

    return elements;
  }

  function renderInlineMarkdown(text) {
    // Handle inline code and bold
    const parts = [];
    let remaining = text;
    let idx = 0;

    while (remaining.length > 0) {
      const codeMatch = remaining.match(/`([^`]+)`/);
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

      let firstMatch = null;
      let matchType = null;

      if (codeMatch && (!boldMatch || codeMatch.index <= boldMatch.index)) {
        firstMatch = codeMatch;
        matchType = 'code';
      } else if (boldMatch) {
        firstMatch = boldMatch;
        matchType = 'bold';
      }

      if (!firstMatch) {
        parts.push(<span key={idx++}>{remaining}</span>);
        break;
      }

      if (firstMatch.index > 0) {
        parts.push(<span key={idx++}>{remaining.slice(0, firstMatch.index)}</span>);
      }

      if (matchType === 'code') {
        parts.push(
          <code key={idx++} className="bg-dark-800 text-brand-400 px-1 py-0.5 rounded text-xs">
            {firstMatch[1]}
          </code>
        );
      } else {
        parts.push(<strong key={idx++} className="text-white font-semibold">{firstMatch[1]}</strong>);
      }

      remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
    }

    return parts.length === 1 ? parts[0] : parts;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Agent Memory</h1>
        <p className="text-dark-300 text-lg">
          Browse and search your agent's persistent memory — everything it has learned and stored.
        </p>
      </div>

      {/* Search bar */}
      {memories.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memory files..."
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-dark-500"
          />
          {search && (
            <div className="mt-2 text-sm text-dark-400">
              {filtered.length} of {memories.length} files match
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card text-center py-16">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-dark-400">Loading agent memory...</p>
        </div>
      )}

      {/* Error: agent not provisioned */}
      {!loading && error === 'agent_not_provisioned' && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">&#129302;</div>
          <h2 className="text-xl font-semibold text-white mb-2">Agent Not Provisioned</h2>
          <p className="text-dark-400 mb-6 max-w-md mx-auto">
            Your agent hasn't been set up yet. Complete onboarding to provision your personal agent.
          </p>
          <Link href="/onboarding" className="btn-primary">
            Complete Onboarding
          </Link>
        </div>
      )}

      {/* Error: other */}
      {!loading && error && error !== 'agent_not_provisioned' && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">&#9888;</div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Memory</h2>
          <p className="text-dark-400 mb-6 max-w-md mx-auto">{error}</p>
          <button onClick={fetchMemories} className="btn-primary">
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && memories.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">&#129504;</div>
          <h2 className="text-xl font-semibold text-white mb-2">Memory is Empty</h2>
          <p className="text-dark-400 mb-6 max-w-md mx-auto">
            Your agent hasn't stored any memories yet. Start a conversation in the workspace
            and ask it to remember things.
          </p>
          <Link href="/workspace" className="btn-primary">
            Go to Workspace
          </Link>
        </div>
      )}

      {/* Memory cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((mem) => {
            const isExpanded = expandedFile === mem.filename;
            const preview = mem.content.slice(0, 300);
            const hasMore = mem.content.length > 300;

            return (
              <div
                key={mem.filename}
                className="card cursor-pointer hover:border-dark-500 transition-colors"
                onClick={() => setExpandedFile(isExpanded ? null : mem.filename)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-400 text-sm font-mono">
                      {mem.filename.endsWith('.md') ? 'MD' : 'TXT'}
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm">{mem.filename}</h3>
                      <div className="text-xs text-dark-500">
                        {formatSize(mem.size)} &middot; {formatDate(mem.modified)}
                      </div>
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-dark-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Content */}
                <div className={`${isExpanded ? '' : 'max-h-32 overflow-hidden relative'}`}>
                  <div className="bg-dark-900 border border-dark-700 rounded-lg p-4">
                    {isExpanded ? renderMarkdown(mem.content) : (
                      <p className="text-sm text-dark-400 whitespace-pre-wrap">{preview}{hasMore && '...'}</p>
                    )}
                  </div>
                  {!isExpanded && hasMore && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-dark-800 to-transparent rounded-b-lg" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh button */}
      {!loading && !error && memories.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={fetchMemories}
            className="text-dark-400 hover:text-white text-sm transition-colors"
          >
            Refresh Memory
          </button>
        </div>
      )}
    </div>
  );
}
