import React, { useState } from 'react';

const FINDINGS = [
  { severity: 'high', text: 'Requires shell/command execution access', note: 'Expected for an AI agent — mitigated by permission controls' },
  { severity: 'positive', text: 'Active security maintenance' },
  { severity: 'positive', text: 'No CVEs found in NVD database' },
  { severity: 'positive', text: 'No hardcoded secrets detected' },
  { severity: 'positive', text: 'Active maintenance' },
];

const RISK_BREAKDOWN = [
  { category: 'Architecture Risk', score: 35, weighted: 7.0 },
  { category: 'Active Vulnerabilities', score: 0, weighted: 0.0 },
  { category: 'News & Expert Warnings', score: 0, weighted: 0.0 },
  { category: 'Maintainer Response', score: 50, weighted: 7.5 },
  { category: 'Viral Growth Risk', score: 0, weighted: 0.0 },
];

/**
 * Compact badge for headers/nav — shows "Security Verified" with green shield.
 * Click to expand the full report summary.
 */
export function PubGuardBadgeCompact({ className = '' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors text-xs"
        title="View PubGuard Security Report"
      >
        <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 1a1 1 0 01.894.553l1.618 3.28 3.622.526a1 1 0 01.748.525 1 1 0 01-.132.913L13.94 9.87l.62 3.617a1 1 0 01-1.45 1.054L10 12.723l-3.11 1.818A1 1 0 015.44 13.487l.62-3.617L3.25 6.797a1 1 0 01.616-1.438l3.622-.526L9.106 1.553A1 1 0 0110 1z" clipRule="evenodd" />
        </svg>
        <span className="text-green-400 font-medium">Security Verified</span>
        <span className="text-green-600 font-mono">15/100</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-50 p-5">
          <PubGuardReportSummary onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/**
 * Full report summary card — used in the dropdown and on the pricing/references pages.
 */
export function PubGuardReportSummary({ onClose, showDownload = true }) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">PubGuard Security Report</h3>
            <p className="text-dark-500 text-xs">Powered by Kira AI | March 19, 2026</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-dark-500 hover:text-white text-sm">x</button>
        )}
      </div>

      {/* Rating */}
      <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400">15</div>
          <div className="text-xs text-green-600">/100 risk</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            <span className="text-green-400 font-semibold text-sm">GREEN — Low Risk</span>
          </div>
          <p className="text-dark-400 text-xs">Appears safe to use with standard precautions</p>
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-1.5 mb-4">
        <div className="text-xs text-dark-500 uppercase tracking-wider mb-1">Findings</div>
        {FINDINGS.map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {f.severity === 'positive' ? (
              <span className="text-green-400 flex-shrink-0 mt-0.5">+</span>
            ) : (
              <span className="text-yellow-400 flex-shrink-0 mt-0.5">!</span>
            )}
            <div>
              <span className={f.severity === 'positive' ? 'text-dark-300' : 'text-yellow-300'}>{f.text}</span>
              {f.note && <span className="text-dark-500 ml-1">— {f.note}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Risk breakdown */}
      <div className="space-y-1 mb-4">
        <div className="text-xs text-dark-500 uppercase tracking-wider mb-1">Risk Breakdown</div>
        {RISK_BREAKDOWN.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-dark-400">{r.category}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${r.score > 30 ? 'bg-yellow-500' : r.score > 0 ? 'bg-green-500' : 'bg-dark-700'}`}
                  style={{ width: `${r.score}%` }}
                />
              </div>
              <span className="text-dark-500 w-8 text-right">{r.weighted}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Download */}
      {showDownload && (
        <a
          href="/pubguard-report.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          Download full report (PDF)
        </a>
      )}
    </div>
  );
}

/**
 * Large card version for pages like /pricing or /references.
 */
export function PubGuardCard() {
  return (
    <div className="card">
      <PubGuardReportSummary showDownload={true} />
    </div>
  );
}
