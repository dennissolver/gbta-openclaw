const FUNCTIONS = [
  { name: 'generatePatchSkeleton', description: 'Generate a patch skeleton from target URLs' },
  { name: 'runQA', description: 'Run QA checks on a generated patch' },
  { name: 'storeInvocationRecord', description: 'Persist an invocation record' },
  { name: 'summarizeMemory', description: 'Summarize memory entries for a workspace' },
];

export default function Functions() {
  return (
    <div style={{ padding: 32 }}>
      <h2>Function Registry</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {FUNCTIONS.map(f => (
            <tr key={f.name} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8, fontFamily: 'monospace' }}>{f.name}</td>
              <td style={{ padding: 8 }}>{f.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <a href="/" style={{ color: '#0070f3', display: 'inline-block', marginTop: 16 }}>Back to home</a>
    </div>
  );
}
