import React from 'react';
import Link from 'next/link';

export default function Memory() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Agent Memory</h1>
        <p className="text-dark-300 text-lg">
          Browse and search your agent's persistent memory — everything it has learned and stored.
        </p>
      </div>

      <div className="card text-center py-16">
        <div className="text-5xl mb-4">🧠</div>
        <h2 className="text-xl font-semibold text-white mb-2">Memory is Empty</h2>
        <p className="text-dark-400 mb-6 max-w-md mx-auto">
          Your agent hasn't stored any memories yet. Start a conversation in the workspace
          and ask it to remember things.
        </p>
        <Link href="/workspace" className="btn-primary">
          Go to Workspace
        </Link>
      </div>
    </div>
  );
}
