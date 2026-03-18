import { useRouter } from 'next/router';

export default function Workspace() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div style={{ padding: 32 }}>
      <h2>Workspace: {id}</h2>
      <p>Workspace detail view — placeholder for future iteration.</p>
      <a href="/" style={{ color: '#0070f3' }}>Back to home</a>
    </div>
  );
}
