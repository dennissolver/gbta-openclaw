import React, { useState, useEffect } from 'react';

const ACHIEVEMENTS = [
  {
    id: 'first-chat',
    label: 'First Chat',
    description: 'Had at least one conversation',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'project-created',
    label: 'Project Created',
    description: 'Created at least one project',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    id: 'memory-stored',
    label: 'Memory Stored',
    description: 'Agent has at least one memory file',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'multiple-sessions',
    label: 'Multiple Sessions',
    description: 'Used more than one session',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'discovery-completed',
    label: 'Discovery Completed',
    description: 'Completed a discovery session',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: 'template-used',
    label: 'Template Used',
    description: 'Used a preset template',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'custom-instructions',
    label: 'Custom Instructions',
    description: 'Created a project with custom instructions',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'files-generated',
    label: 'Files Generated',
    description: 'Agent has created files in workspace',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const STORAGE_KEY = 'openclaw-achievements';

export function unlockAchievement(id) {
  if (typeof window === 'undefined') return;
  const achievements = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (!achievements[id]) {
    achievements[id] = { unlocked: true, date: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
  }
}

export function getAchievements() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

export default function AchievementTracker({ expanded: expandedProp = false }) {
  const [achievements, setAchievements] = useState({});
  const [expanded, setExpanded] = useState(expandedProp);

  useEffect(() => {
    setAchievements(getAchievements());

    // Listen for achievement updates
    const handler = () => setAchievements(getAchievements());
    window.addEventListener('achievement-unlocked', handler);
    return () => window.removeEventListener('achievement-unlocked', handler);
  }, []);

  const unlockedCount = ACHIEVEMENTS.filter((a) => achievements[a.id]?.unlocked).length;
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlockedCount / total) * 100);

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
      {/* Compact view */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-800/50 transition-colors"
      >
        {/* Progress ring */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-dark-700"
            />
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-brand-500"
              strokeDasharray={`${(pct / 100) * 81.68} 81.68`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
            {unlockedCount}
          </span>
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm text-dark-200">
            {unlockedCount}/{total} capabilities explored
          </div>
          {/* Thin progress bar */}
          <div className="mt-1 h-1 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-dark-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded view */}
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = achievements[a.id]?.unlocked;
            return (
              <div
                key={a.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  unlocked
                    ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                    : 'bg-dark-800/50 border-dark-700 text-dark-500'
                }`}
              >
                <div className={`flex-shrink-0 ${unlocked ? 'text-brand-400' : 'text-dark-600'}`}>
                  {a.icon}
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-medium truncate ${unlocked ? 'text-brand-300' : 'text-dark-500'}`}>
                    {a.label}
                  </div>
                  <div className="text-[10px] text-dark-600 truncate">{a.description}</div>
                </div>
                {unlocked && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 ml-auto flex-shrink-0 text-brand-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
