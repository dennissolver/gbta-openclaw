import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const COLOR_MAP = {
  brand: { bg: 'bg-brand-500/10', border: 'border-brand-500/30', text: 'text-brand-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
};

export default function SharedPage() {
  const router = useRouter();
  const { token } = router.query;
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchShareData() {
      try {
        const resp = await fetch(`/api/share-resolve?token=${encodeURIComponent(token)}`);
        if (resp.ok) {
          const data = await resp.json();
          setShareData(data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchShareData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-dark-400">Loading...</div>
      </div>
    );
  }

  if (notFound || !shareData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-4xl mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Shared link not found</h1>
        <p className="text-dark-400 mb-8">This link may have expired or been removed.</p>
        <Link href="/" className="btn-primary">
          Go to EasyOpenClaw
        </Link>
      </div>
    );
  }

  const c = COLOR_MAP[shareData.color] || COLOR_MAP.brand;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple header */}
      <header className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:bg-brand-400 transition-colors">
                EO
              </div>
              <span className="text-white font-semibold text-lg">EasyOpenClaw</span>
            </Link>
            <Link href="/onboarding" className="btn-primary text-sm">
              Try Free
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full">
          <div className={`card ${c.bg} border ${c.border}`}>
            {/* Icon & Type */}
            <div className="flex items-center gap-3 mb-4">
              {shareData.icon && (
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${c.bg} border ${c.border}`}>
                  {shareData.icon}
                </div>
              )}
              <div>
                <span className={`text-xs font-medium uppercase tracking-wide ${c.text}`}>
                  {shareData.type === 'achievement' ? 'Achievement' : 'Shared Project'}
                </span>
              </div>
            </div>

            {/* Name */}
            <h1 className="text-2xl font-bold text-white mb-2">
              {shareData.name || 'Untitled'}
            </h1>

            {/* Description */}
            {shareData.description && (
              <p className="text-dark-300 text-sm mb-4 leading-relaxed">
                {shareData.description}
              </p>
            )}

            {/* Achievement text */}
            {shareData.text && (
              <p className="text-dark-200 text-sm mb-4">{shareData.text}</p>
            )}

            {/* Stats */}
            {shareData.stats && (
              <div className="flex gap-4 mb-4">
                {Object.entries(shareData.stats).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-lg font-bold text-white">{value}</div>
                    <div className="text-xs text-dark-500 capitalize">{key}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Privacy note */}
            <div className="flex items-center gap-2 text-xs text-dark-500 mt-4 pt-4 border-t border-dark-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Chat content is private and not included in shared links.
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              Try EasyOpenClaw Free
            </h2>
            <p className="text-dark-400 text-sm mb-4">
              AI-powered automation for professionals. Start with 50 free messages per month.
            </p>
            <Link href="/onboarding" className="btn-primary px-8 py-3">
              Get Started Free
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
