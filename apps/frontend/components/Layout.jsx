import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/templates', label: 'Templates' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/functions', label: 'Functions' },
];

export default function Layout({ children }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:bg-brand-400 transition-colors">
                OC
              </div>
              <div>
                <span className="text-white font-semibold text-lg">OpenClaw</span>
                <span className="text-dark-400 text-xs ml-2 hidden sm:inline">by GBTA</span>
              </div>
            </Link>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={router.pathname === item.href ? 'nav-link-active' : 'nav-link'}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link href="/workspace" className="btn-primary text-sm">
                Launch Agent
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden border-b border-dark-800 bg-dark-900 px-4 py-2 flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap text-sm ${router.pathname === item.href ? 'nav-link-active' : 'nav-link'}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-dark-400">
            <div>
              OpenClaw by <span className="text-white">Global Buildtech Australia</span>
            </div>
            <div className="flex gap-6">
              <a href="https://openclaw.ai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                OpenClaw Project
              </a>
              <a href="https://github.com/openclaw/openclaw" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
