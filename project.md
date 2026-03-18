 Here's a Claude Code-ready project.md tailored for gbta-openclaw (OpenClaw MVP), monorepo pattern, Next.js frontend, Express backend, Supabase Auth. It provides a complete,
 self-contained handoff that Claude Code can execute inside PyCharm or any IDE by creating the described files and wiring them up. It intentionally excludes TenderWatch and any
 unrelated code.

 gbta-openclaw MVP — Monorepo, Next.js frontend + Express backend, Supabase Auth (Claude Code handoff)

 1. Objective
 - Build a minimal but end-to-end MVP monorepo that:
 - Exposes a Next.js frontend with a chat-like UI, a project/workspace explorer, a function registry, and a patch viewer
 - Exposes an Express backend with a /functions/invoke API and a simple in-memory invocation store
 - Provides a small function registry with stub functions: generatePatchSkeleton, runQA, storeInvocationRecord, summarizeMemory
 - Includes a patch generator stub that outputs NSW_buy_nsw_refined.patch, NSW_buy_nsw_refined.patch.notes, NSW_buy_nsw_refined.patch.qa.md
 - Uses Supabase Auth for user management in MVP
 - Is ready to be wired to Supabase DB and Vercel hosting
 - Deliverables:
 - A single gbta-openclaw monorepo structure with starter code
 - Clear instructions for Claude Code to create files and wire them up
 - A minimal README with run instructions and extension points for future work

 2. Tech stack (as agreed)
 - Frontend: Next.js with React
 - Backend: Node.js with Express
 - Auth: Supabase Auth (MVP scaffold)
 - Data layer: Supabase (PostgreSQL) + optional Storage for artefacts
 - CI/CD: GitHub Actions; Frontend deployed to Vercel
 - IDE workflow: Claude Code can generate or modify code in PyCharm-friendly layout

 3. Repository layout (Monorepo Pattern 1)
 - gbta-openclaw/
 - apps/
 - frontend/
 - package.json
 - next.config.js
 - pages/
 - index.jsx
 - workspace/[id].jsx
 - memory.jsx
 - functions.jsx
 - components/
 - ChatPanel.jsx
 - ProjectSidebar.jsx
 - FunctionList.jsx
 - PatchViewer.jsx
 - public/
 - (optional placeholder assets)
 - styles/
 - globals.css
 - backend/
 - package.json
 - src/
 - index.js
 - routes/
 - invoke.js
 - invocations.js
 - services/
 - FunctionRegistry.js
 - InvocationEngine.js
 - PatchGenerator.js
 - models/
 - Function.js
 - config/
 - env.example.json
 - shared/
 - patch_generator/
 - generatePatchSkeleton.js
 - types/
 - function.d.ts
 - infrastructure/
 - db/
 - init.sql
 - migrations/
 - 001-create-tables.sql
 - docs/
 - architecture.md
 - MVP-plan.md
 - API-contracts.md
 - scripts/
 - dev-run-local.sh
 - .github/
 - workflows/
 - ci.yml
 - deploy-front-end.yml
 - deploy-backend.yml
 - README.md
 - package.json
 - pnpm-workspace.yaml (optional)

 4. Starter file templates (ready-to-paste content)

 4.1 Root package.json (workspace)
 {
 "name": "gbta-openclaw",
 "private": true,
 "workspaces": [
 "apps/",
 "shared/",
 "infrastructure/*",
 "scripts"
 ],
 "scripts": {
 "dev:frontend": "node apps/frontend/server.js",
 "dev:backend": "node apps/backend/src/index.js",
 "start": "concurrently "npm run -w apps/frontend dev" "npm run -w apps/backend dev"",
 "lint": "echo Lint not implemented in this scaffold yet"
 },
 "devDependencies": {
 "concurrently": "^8.0.0"
 }
 }

 4.2 apps/frontend/package.json
 {
 "name": "gbta-openclaw-frontend",
 "private": true,
 "scripts": {
 "dev": "next dev",
 "build": "next build",
 "start": "next start"
 },
 "dependencies": {
 "react": "^18.2.0",
 "react-dom": "^18.2.0",
 "next": "^13.3.0",
 "@mui/material": "^5.12.0",
 "@mui/icons-material": "^5.12.0",
 "axios": "^0.28.0"
 }
 }

 4.3 apps/frontend/pages/index.jsx
 import React, { useState } from 'react';
 import axios from 'axios';

 export default function Home() {
 const [msg, setMsg] = useState('');
 const [logs, setLogs] = useState([{ role: 'user', text: 'Hello OpenClaw' }]);
 const [loading, setLoading] = useState(false);

 const send = async () => {
 if (!msg.trim()) return;
 const userMsg = { role: 'user', text: msg };
 setLogs(l => [...l, userMsg]);
 setMsg('');
 setLoading(true);

 try {
 const resp = await axios.post('/functions/invoke', {
 functionName: 'generatePatchSkeleton',
 inputs: { urls: ['https://buy.nsw.gov.au/login', 'https://buy.nsw.gov.au/login/signup'], targetDir: 'workspace/nsw' },
 invocationId: 'inv-mvp-1',
 });
 const out = resp.data.outputs?.patch || '[no patch generated]';
 setLogs(l => [...l, { role: 'assistant', text: out }]);
 } catch (e) {
 setLogs(l => [...l, { role: 'assistant', text: 'Error invoking backend' }]);
 } finally {
 setLoading(false);
 }
 };

 return (

 <div style={{ display: 'flex', height: '100vh' }}>
 <aside style={{ width: 260, borderRight: '1px solid #ddd', padding: 16 }}>
 <h3>Projects</h3>
 <div>workspace/default</div>
 </aside>
 <main style={{ flex: 1, padding: 16 }}>
 <div style={{ border: '1px solid #ddd', height: '60%', padding: 8, overflow: 'auto' }}>
 {logs.map((m, i) => (
 <div key={i} style={{ textAlign: m.role === 'user' ? 'left' : 'right' }}>
 <strong>{m.role}</strong>: {m.text}
 </div>
 ))}
 </div>
 <div style={{ marginTop: 8, display: 'flex' }}>
 <input style={{ flex: 1 }} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Ask OpenClaw..." />
 <button onClick={send} disabled={loading}>{loading ? 'Working...' : 'Send'}</button>
 </div>
 </main>
 <aside style={{ width: 360, borderLeft: '1px solid #ddd', padding: 16 }}>
 <h3>Functions</h3>
 <ul>
 <li>generatePatchSkeleton</li>
 <li>runQA</li>
 <li>storeInvocationRecord</li>
 </ul>
 <h3>Patches</h3>
 <div id="patch-viewer" style={{ border: '1px solid #ccc', height: '40vh', padding: 8 }}>
 NSW_buy_nsw_refined.patch (placeholder)
 </div>
 </aside>
 </div>
 );
 }
 4.4 apps/backend/package.json
 {
 "name": "gbta-openclaw-backend",
 "private": true,
 "scripts": {
 "dev": "node src/index.js",
 "start": "node src/index.js"
 },
 "dependencies": {
 "express": "^4.18.2",
 "cors": "^2.8.5",
 "body-parser": "^1.20.2"
 }
 }

 4.5 apps/backend/src/index.js
 const express = require('express');
 const app = express();
 app.use(express.json());

 let invCounter = 1;
 const invStore = {};

 function generatePatchSkeleton(urls, targetDir) {
 return --- NSW patch skeleton --- urls: ${urls.join(', ')} target: ${targetDir} --- end ---;
 }

 app.post('/functions/invoke', (req, res) => {
 const { functionName, inputs } = req.body;
 const invocationId = inv-${invCounter++};
 let outputs = null;

 if (functionName === 'generatePatchSkeleton') {
 outputs = { patch: generatePatchSkeleton(inputs.url s || [], inputs.targetDir || '.') };
 } else if (functionName === 'runQA') {
 outputs = { qa: 'QA stub: all checks passed in MVP' };
 } else if (functionName === 'storeInvocationRecord') {
 outputs = { note: 'invocation stored' };
 } else {
 outputs = { message: 'unknown function' };
 }

 invStore[invocationId] = {
 functionName,
 inputs,
 outputs,
 status: 'succeeded',
 timestamp: new Date().toISOString()
 };

 res.json({ invocationId, status: 'succeeded', outputs });
 });

 app.get('/invocations/:id', (req, res) => {
 const id = req.params.id;
 res.json(invStore[id] || { error: 'not found' });
 });

 const port = process.env.PORT || 3001;
 app.listen(port, () => console.log(Backend listening on ${port}));

 4.6 infrastructure/db/init.sql
 -- Minimal Supabase schema for MVP
 CREATE TABLE FunctionRegistry (
 id TEXT PRIMARY KEY,
 name TEXT,
 description TEXT,
 inputSchema JSONB,
 outputSchema JSONB
 );

 CREATE TABLE Invocations (
 id TEXT PRIMARY KEY,
 functionName TEXT,
 inputs JSONB,
 outputs JSONB,
 status TEXT,
 timestamp TIMESTAMP DEFAULT now()
 );

 CREATE TABLE Artifacts (
 id TEXT PRIMARY KEY,
 type TEXT,
 location TEXT,
 metadata JSONB
 );

 CREATE TABLE MemoryEntries (
 id TEXT PRIMARY KEY,
 file TEXT,
 content TEXT,
 sourceInvocationId TEXT,
 timestamp TIMESTAMP DEFAULT now()
 );

 4.7 docs/architecture.md
 - High-level architecture diagram (text)
 - Roles of frontend, backend, function registry, invocation engine
 - Data flow: user prompt -> UI -> /functions/invoke -> invoke -> patch generation -> store artifacts -> display

 4.8 docs/MVP-plan.md
 - MVP milestones
 - Acceptance criteria
 - Non-functional constraints (security, auth, isolation)

 4.9 .github/workflows/ci.yml
 name: CI
 on: [push, pull_request]
 jobs:
 build:
 runs-on: ubuntu-latest
 steps:
 - uses: actions/checkout@v4
 - name: Setup Node
 uses: actions/setup-node@v4
 with:
 node-version: '18'
 - name: Install
 run: npm ci
 - name: Build frontend
 run: cd apps/frontend && npm ci && npm run build
 - name: Build backend
 run: cd apps/backend && npm ci

 4.10 scripts/dev-run-local.sh
 #!/usr/bin/env bash
 set -euo pipefail
 echo "Starting backend..."
 (cd apps/backend && npm i && npm run dev) &
 echo "Starting frontend..."
 (cd apps/frontend && npm i && npm run dev)

 5. How Claude Code should implement
 - Use the file tree and templates to actually generate a runnable monorepo.
 - Create the files exactly as specified, ensuring proper module boundaries, imports, and environments.
 - Wire Supabase Auth scaffolding (env vars, middleware placeholders) so MVP can be run with a local or staging Supabase instance.
 - Provide a README with precise run commands and environment variable names:
 - SUPABASE_URL
 - SUPABASE_ANON_KEY
 - Optional: NEXT_PUBLIC_SUPABASE_URL if the frontend directly uses Supabase

 6. Acceptance criteria for MVP
 - Frontend: basic chat area, project/workspace placeholder, function registry panel, and patch viewer
 - Backend: /functions/invoke supports generatePatchSkeleton, runQA, storeInvocationRecord; in-memory persistence
 - Patch generator: outputs NSW_buy_nsw_refined.patch, NSW_buy_nsw_refined.patch.notes, NSW_buy_nsw_refined.patch.qa.md (via generator stub)
 - Supabase scaffold present (SQL migrations) and ready to run
 - CI: GitHub Actions workflows wired (lint/test placeholders)
 - Documentation: architecture.md, MVP-plan.md, API-contracts.md

 7. Next steps for Claude Code
 - If you want, I can generate the exact content blocks for every file in the tree as code blocks, and provide a single, copy-pasteable submission for Claude Code to execute in
 PyCharm (or any IDE). This would be a “file-by-file” handoff with precise content, ready to paste into your editor.

 8. Quick start checklist (once Claude Code has generated files)
 - Create a new GitHub repo gbta-openclaw and initialize with these files
 - Install dependencies at root and per-app
 - npm i at root (workspaces) or per-app npm i
 - npm i in apps/frontend
 - npm i in apps/backend
 - Run migrations in Supabase (init.sql)
 - Configure backend env with SUPABASE_URL and SUPABASE_ANON_KEY
 - Start backend and frontend
 - Backend: node apps/backend/src/index.js
 - Frontend: npm run dev in apps/frontend
 - Open http://localhost:3000 to view MVP

 9. Safety and scope notes
 - This MVP intentionally uses in-memory storage for invocations and patch generation stubs. It is designed as a scaffold for rapid iteration, not a production-grade automation
 system.
 - Supabase Auth is scaffolded for MVP; replace or augment with your preferred auth flow if needed.
 - No live form submissions or web automation are included in this MVP. External actions require explicit approval and safe environments in later iterations.

 10. Deliverables to Claude Code
 - A single, coherent project.md as above (this document) plus a complete file tree and exact file contents to generate the repo.
 - If you want, I can also produce a follow-up with a ready-to-paste “starter set” of code blocks for each file to paste into Claude Code, but given your preference, this
 document suffices for a thorough handoff.

 Would you like me to proceed by providing a Claude Code-ready, exact-by-file content set (copiable blocks) for the gbta-openclaw monorepo, or is this project.md sufficient for
 your workflow? If you want the exact file contents in blocks, I can generate them in the next message.
 connected | idle