import React from 'react';

export default function PatchViewer({ patch }) {
  return (
    <div>
      <h3 style={{ fontSize: 15, marginBottom: 8 }}>Patch Viewer</h3>
      <div style={{
        border: '1px solid #ccc', borderRadius: 4, padding: 10,
        background: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace',
        fontSize: 12, minHeight: 200, whiteSpace: 'pre-wrap', overflow: 'auto',
      }}>
        {patch ? (
          <>
            <div style={{ color: '#6a9955' }}>// NSW_buy_nsw_refined.patch</div>
            <div>{patch.patch || JSON.stringify(patch, null, 2)}</div>
            {patch.notes && (
              <>
                <div style={{ color: '#6a9955', marginTop: 8 }}>// .patch.notes</div>
                <div>{patch.notes}</div>
              </>
            )}
            {patch.qa && (
              <>
                <div style={{ color: '#6a9955', marginTop: 8 }}>// .patch.qa.md</div>
                <div>{patch.qa}</div>
              </>
            )}
          </>
        ) : (
          <span style={{ color: '#666' }}>No patch generated yet. Send a message to invoke a function.</span>
        )}
      </div>
    </div>
  );
}
