import React from 'react';

const FUNCTIONS = [
  'generatePatchSkeleton',
  'runQA',
  'storeInvocationRecord',
  'summarizeMemory',
];

export default function FunctionList() {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, marginBottom: 8 }}>Functions</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {FUNCTIONS.map(f => (
          <li key={f} style={{
            fontFamily: 'monospace', fontSize: 13, padding: '4px 0',
            borderBottom: '1px solid #f0f0f0',
          }}>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
