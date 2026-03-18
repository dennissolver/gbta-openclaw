import React from 'react';

const WORKSPACES = [
  { id: 'default', label: 'workspace/default' },
  { id: 'nsw', label: 'workspace/nsw' },
];

export default function ProjectSidebar() {
  return (
    <aside style={{
      width: 240, borderRight: '1px solid #ddd', padding: 16,
      background: '#f9f9f9', display: 'flex', flexDirection: 'column',
    }}>
      <h3 style={{ marginBottom: 12, fontSize: 16 }}>Projects</h3>
      {WORKSPACES.map(ws => (
        <a
          key={ws.id}
          href={`/workspace/${ws.id}`}
          style={{
            display: 'block', padding: '6px 8px', marginBottom: 4,
            borderRadius: 4, color: '#333', textDecoration: 'none',
            fontSize: 14,
          }}
        >
          {ws.label}
        </a>
      ))}
      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #eee' }}>
        <a href="/functions" style={{ fontSize: 13, color: '#0070f3', textDecoration: 'none' }}>Function Registry</a>
        <br />
        <a href="/memory" style={{ fontSize: 13, color: '#0070f3', textDecoration: 'none' }}>Memory Explorer</a>
      </div>
    </aside>
  );
}
