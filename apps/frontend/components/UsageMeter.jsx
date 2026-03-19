import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function UsageMeter({ onLimitReached }) {
  const { user, supabase } = useAuth();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!user || !supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const resp = await fetch('/api/usage', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setUsage(data);
        if (data.percentUsed >= 100 && onLimitReached) {
          onLimitReached(data);
        }
      }
    } catch (e) {
      console.warn('[UsageMeter] Failed to fetch usage:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, onLimitReached]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Listen for usage refresh events (triggered after sending a message)
  useEffect(() => {
    const handler = () => fetchUsage();
    window.addEventListener('usage-refresh', handler);
    return () => window.removeEventListener('usage-refresh', handler);
  }, [fetchUsage]);

  if (!user || loading || !usage) return null;

  const { used, limit, tier, percentUsed } = usage;
  const isUnlimited = limit >= 999999;

  if (isUnlimited) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/50 border border-dark-700 rounded-lg">
        <div className="w-2 h-2 bg-purple-500 rounded-full" />
        <span className="text-xs text-dark-300">Business &mdash; Unlimited</span>
      </div>
    );
  }

  // Determine color based on percentage
  let barColor = 'bg-brand-500';
  let textColor = 'text-brand-400';
  if (percentUsed >= 85) {
    barColor = 'bg-red-500';
    textColor = 'text-red-400';
  } else if (percentUsed >= 60) {
    barColor = 'bg-yellow-500';
    textColor = 'text-yellow-400';
  }

  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${textColor}`}>
          {used}/{limit} messages
        </span>
        <span className="text-[10px] text-dark-500 capitalize">{tier}</span>
      </div>
      <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      {percentUsed >= 85 && percentUsed < 100 && (
        <Link
          href="/pricing"
          className="text-[10px] text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          Upgrade to Pro for 500 messages &rarr;
        </Link>
      )}
      {percentUsed >= 100 && (
        <span className="text-[10px] text-red-400 font-medium">
          Monthly limit reached
        </span>
      )}
    </div>
  );
}
