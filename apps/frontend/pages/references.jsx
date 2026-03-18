import React, { useState } from 'react';
import Link from 'next/link';

const DEPENDENCIES = [
  { name: 'OpenClaw', license: 'MIT', url: 'https://github.com/openclaw/openclaw/blob/main/LICENSE' },
  { name: 'Next.js', license: 'MIT', url: 'https://github.com/vercel/next.js/blob/canary/license.md' },
  { name: 'React', license: 'MIT', url: 'https://github.com/facebook/react/blob/main/LICENSE' },
  { name: '@supabase/supabase-js', license: 'MIT', url: 'https://github.com/supabase/supabase-js' },
  { name: 'Tailwind CSS', license: 'MIT', url: 'https://github.com/tailwindlabs/tailwindcss' },
  { name: '@elevenlabs/react', license: 'MIT', url: 'https://github.com/elevenlabs/elevenlabs-js' },
  { name: 'ws', license: 'MIT', url: 'https://github.com/websockets/ws' },
];

function AccordionSection({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="border border-dark-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-dark-800/50 transition-colors"
      >
        <span className="text-white font-semibold text-lg">{title}</span>
        <svg
          className={`w-5 h-5 text-dark-400 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-5 text-dark-300 text-sm leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

export default function References() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">References & Acknowledgments</h1>
        <p className="text-dark-300 text-lg max-w-2xl mx-auto">
          EasyOpenClaw is built on top of outstanding open-source software.
          This page acknowledges the projects and licenses that make it possible.
        </p>
      </div>

      <div className="space-y-4">
        {/* OpenClaw */}
        <AccordionSection title="OpenClaw" defaultOpen={true}>
          <p className="mb-3">
            EasyOpenClaw is a wrapper around{' '}
            <strong className="text-white">OpenClaw</strong>, an open-source autonomous AI agent
            licensed under the MIT License.
          </p>
          <a
            href="https://github.com/openclaw/openclaw/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 transition-colors"
          >
            View OpenClaw License (MIT) &rarr;
          </a>
        </AccordionSection>

        {/* Wrapper Attribution */}
        <AccordionSection title="Wrapper Attribution" defaultOpen={true}>
          <p className="mb-3">
            EasyOpenClaw is provided by{' '}
            <strong className="text-white">Corporate AI Solutions</strong>.
            This is not the original OpenClaw project. It is an independent wrapper product
            that builds on top of the OpenClaw platform.
          </p>
          <a
            href="https://www.corporateaisolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 transition-colors"
          >
            Visit Corporate AI Solutions &rarr;
          </a>
        </AccordionSection>

        {/* Dependencies */}
        <AccordionSection title="Dependencies & Licenses">
          <p className="mb-4">
            Key open-source dependencies used in EasyOpenClaw:
          </p>
          <div className="space-y-2">
            {DEPENDENCIES.map((dep) => (
              <div
                key={dep.name}
                className="flex items-center justify-between bg-dark-800/50 border border-dark-700 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{dep.name}</span>
                  <span className="badge-green text-xs">{dep.license}</span>
                </div>
                <a
                  href={dep.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:text-brand-300 text-sm transition-colors"
                >
                  License
                </a>
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* Disclaimer */}
        <AccordionSection title="Disclaimer" defaultOpen={true}>
          <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
            <p>
              EasyOpenClaw is an independent wrapper product. It is{' '}
              <strong className="text-white">
                not affiliated with, endorsed by, or sponsored by
              </strong>{' '}
              the OpenClaw project or its maintainers.
            </p>
          </div>
        </AccordionSection>
      </div>

      {/* Back to home */}
      <div className="text-center mt-12">
        <Link href="/" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
