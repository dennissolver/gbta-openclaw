import React, { useState } from 'react';
import ChatPanel from '../components/ChatPanel';
import ProjectSidebar from '../components/ProjectSidebar';
import FunctionList from '../components/FunctionList';
import PatchViewer from '../components/PatchViewer';

export default function Home() {
  const [selectedPatch, setSelectedPatch] = useState(null);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <ProjectSidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
        <h2 style={{ marginBottom: 12 }}>OpenClaw MVP</h2>
        <ChatPanel onPatchGenerated={setSelectedPatch} />
      </main>
      <aside style={{ width: 380, borderLeft: '1px solid #ddd', padding: 16, overflow: 'auto' }}>
        <FunctionList />
        <PatchViewer patch={selectedPatch} />
      </aside>
    </div>
  );
}
