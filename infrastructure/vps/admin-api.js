/**
 * OpenClaw VPS Admin API
 *
 * Lightweight Express server running on the VPS (port 18790) that provides
 * HTTP endpoints for managing OpenClaw agents. Called by the Next.js frontend
 * running on Vercel.
 *
 * Auth: Bearer token matching the gateway token.
 *
 * Endpoints:
 *   POST   /agents/create          — Create a new agent
 *   DELETE  /agents/:id             — Delete an agent
 *   GET    /agents                  — List all agents
 *   GET    /agents/:id/memory       — Read agent memory files
 *   GET    /agents/:id/files        — List workspace files
 *   GET    /agents/:id/files/:filename — Read a specific workspace file
 *   POST   /agents/:id/cron         — Create a cron job for an agent
 */

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = process.env.ADMIN_API_PORT || 18790;
const AUTH_TOKEN = process.env.ADMIN_API_TOKEN || process.env.OPENCLAW_GATEWAY_TOKEN || '';
const OPENCLAW_BASE = '/root/.openclaw';
const AGENTS_DIR = path.join(OPENCLAW_BASE, 'agents');
const WORKSPACES_DIR = path.join(OPENCLAW_BASE, 'workspaces');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function authenticate(req) {
  if (!AUTH_TOKEN) return false;
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${AUTH_TOKEN}`;
}

function parseUrl(url) {
  const [pathname, querystring] = (url || '').split('?');
  const params = new URLSearchParams(querystring || '');
  return { pathname: pathname.replace(/\/+$/, ''), params };
}

function safeAgentId(id) {
  // Only allow alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

function execCommand(cmd) {
  return execSync(cmd, {
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' },
  }).trim();
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleCreateAgent(req, res) {
  const body = await parseBody(req);
  const { agentId, model } = body;

  if (!agentId || !safeAgentId(agentId)) {
    return sendJson(res, 400, { error: 'Invalid or missing agentId' });
  }

  const agentModel = model || 'openrouter/auto';
  const workspace = path.join(WORKSPACES_DIR, agentId);

  try {
    // Create the agent
    const result = execCommand(
      `openclaw agents add ${agentId} --model ${agentModel} --workspace ${workspace} --non-interactive --json`
    );

    // Copy auth profile from main agent if it exists
    const mainAuthProfile = path.join(AGENTS_DIR, 'main', 'agent', 'auth-profiles.json');
    const newAuthProfile = path.join(AGENTS_DIR, agentId, 'agent', 'auth-profiles.json');

    if (fs.existsSync(mainAuthProfile)) {
      // Ensure the target directory exists
      const targetDir = path.dirname(newAuthProfile);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(mainAuthProfile, newAuthProfile);
    }

    // Ensure workspace directory exists
    if (!fs.existsSync(workspace)) {
      fs.mkdirSync(workspace, { recursive: true });
    }

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = { raw: result };
    }

    sendJson(res, 201, { ok: true, agentId, result: parsed });
  } catch (err) {
    console.error('[admin-api] Create agent error:', err.message);
    sendJson(res, 500, { error: err.message || 'Failed to create agent' });
  }
}

async function handleDeleteAgent(res, agentId) {
  if (!agentId || !safeAgentId(agentId)) {
    return sendJson(res, 400, { error: 'Invalid agentId' });
  }

  // Never allow deleting the main agent
  if (agentId === 'main') {
    return sendJson(res, 403, { error: 'Cannot delete the main agent' });
  }

  try {
    execCommand(`openclaw agents delete ${agentId} --force`);
    sendJson(res, 200, { ok: true, agentId, status: 'deleted' });
  } catch (err) {
    console.error('[admin-api] Delete agent error:', err.message);
    sendJson(res, 500, { error: err.message || 'Failed to delete agent' });
  }
}

function handleListAgents(res) {
  try {
    const result = execCommand('openclaw agents list --json');
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = { raw: result };
    }
    sendJson(res, 200, { ok: true, agents: parsed });
  } catch (err) {
    console.error('[admin-api] List agents error:', err.message);
    sendJson(res, 500, { error: err.message || 'Failed to list agents' });
  }
}

function handleGetMemory(res, agentId) {
  if (!agentId || !safeAgentId(agentId)) {
    return sendJson(res, 400, { error: 'Invalid agentId' });
  }

  const memoryDir = path.join(AGENTS_DIR, agentId, 'agent', 'memory');

  if (!fs.existsSync(memoryDir)) {
    return sendJson(res, 200, { ok: true, agentId, memories: [] });
  }

  try {
    const files = fs.readdirSync(memoryDir).filter(f => {
      const stat = fs.statSync(path.join(memoryDir, f));
      return stat.isFile();
    });

    const memories = files.map(filename => {
      const filePath = path.join(memoryDir, filename);
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        filename,
        content,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });

    sendJson(res, 200, { ok: true, agentId, memories });
  } catch (err) {
    console.error('[admin-api] Get memory error:', err.message);
    sendJson(res, 500, { error: err.message || 'Failed to read memory' });
  }
}

function handleListFiles(res, agentId) {
  if (!agentId || !safeAgentId(agentId)) {
    return sendJson(res, 400, { error: 'Invalid agentId' });
  }

  const workspace = path.join(WORKSPACES_DIR, agentId);

  if (!fs.existsSync(workspace)) {
    return sendJson(res, 200, { ok: true, agentId, files: [] });
  }

  try {
    const entries = fs.readdirSync(workspace);
    const files = entries.map(name => {
      const filePath = path.join(workspace, name);
      const stat = fs.statSync(filePath);
      return {
        name,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        isDirectory: stat.isDirectory(),
      };
    });

    sendJson(res, 200, { ok: true, agentId, files });
  } catch (err) {
    console.error('[admin-api] List files error:', err.message);
    sendJson(res, 500, { error: err.message || 'Failed to list files' });
  }
}

function handleGetFile(res, agentId, filename) {
  if (!agentId || !safeAgentId(agentId)) {
    return sendJson(res, 400, { error: 'Invalid agentId' });
  }

  // Prevent path traversal
  const sanitized = path.basename(filename);
  const filePath = path.join(WORKSPACES_DIR, agentId, sanitized);

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 404, { error: 'File not found' });
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return sendJson(res, 400, { error: 'Path is a directory, not a file' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    sendJson(res, 200, {
      ok: true,
      agentId,
      filename: sanitized,
      content,
      size: stat.size,
      modified: stat.mtime.toISOString(),
    });
  } catch (err) {
    console.error('[admin-api] Get file error:', err.message);
    sendJson(res, 500, { error: err.message || 'Failed to read file' });
  }
}

async function handleCreateCron(req, res, agentId) {
  if (!agentId || !safeAgentId(agentId)) {
    return sendJson(res, 400, { error: 'Invalid agentId' });
  }

  const body = await parseBody(req);
  const { schedule, command, description } = body;

  if (!schedule || !command) {
    return sendJson(res, 400, { error: 'schedule and command are required' });
  }

  try {
    // Append to the agent's crontab file
    const cronDir = path.join(AGENTS_DIR, agentId, 'agent');
    if (!fs.existsSync(cronDir)) {
      fs.mkdirSync(cronDir, { recursive: true });
    }

    const cronFile = path.join(cronDir, 'crontab');
    const entry = `# ${description || 'Scheduled task'}\n${schedule} ${command}\n`;

    fs.appendFileSync(cronFile, entry);

    // Also install into system crontab
    try {
      const existing = execCommand('crontab -l 2>/dev/null || true');
      const newCrontab = existing + `\n# OpenClaw agent ${agentId}: ${description || 'task'}\n${schedule} ${command}\n`;
      execSync(`echo "${newCrontab.replace(/"/g, '\\"')}" | crontab -`, { encoding: 'utf-8' });
    } catch (cronErr) {
      console.warn('[admin-api] System crontab update failed:', cronErr.message);
    }

    sendJson(res, 201, { ok: true, agentId, schedule, command, description });
  } catch (err) {
    console.error('[admin-api] Create cron error:', err.message);
    sendJson(res, 500, { error: err.message || 'Failed to create cron job' });
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function router(req, res) {
  const { pathname } = parseUrl(req.url);
  const method = req.method;

  // Health check (no auth required)
  if (pathname === '/health' && method === 'GET') {
    return sendJson(res, 200, { ok: true, service: 'openclaw-admin-api', uptime: process.uptime() });
  }

  // Authenticate all other routes
  if (!authenticate(req)) {
    return sendJson(res, 401, { error: 'Unauthorized' });
  }

  // POST /agents/create
  if (pathname === '/agents/create' && method === 'POST') {
    return handleCreateAgent(req, res);
  }

  // GET /agents
  if (pathname === '/agents' && method === 'GET') {
    return handleListAgents(res);
  }

  // Route patterns with agent ID
  const agentMatch = pathname.match(/^\/agents\/([^/]+)$/);
  const memoryMatch = pathname.match(/^\/agents\/([^/]+)\/memory$/);
  const filesMatch = pathname.match(/^\/agents\/([^/]+)\/files$/);
  const fileMatch = pathname.match(/^\/agents\/([^/]+)\/files\/(.+)$/);
  const cronMatch = pathname.match(/^\/agents\/([^/]+)\/cron$/);

  // DELETE /agents/:id
  if (agentMatch && method === 'DELETE') {
    return handleDeleteAgent(res, agentMatch[1]);
  }

  // GET /agents/:id/memory
  if (memoryMatch && method === 'GET') {
    return handleGetMemory(res, memoryMatch[1]);
  }

  // GET /agents/:id/files/:filename
  if (fileMatch && method === 'GET') {
    return handleGetFile(res, fileMatch[1], fileMatch[2]);
  }

  // GET /agents/:id/files
  if (filesMatch && method === 'GET') {
    return handleListFiles(res, filesMatch[1]);
  }

  // POST /agents/:id/cron
  if (cronMatch && method === 'POST') {
    return handleCreateCron(req, res, cronMatch[1]);
  }

  sendJson(res, 404, { error: 'Not found' });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  // CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    await router(req, res);
  } catch (err) {
    console.error('[admin-api] Unhandled error:', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal server error' });
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[admin-api] OpenClaw Admin API listening on port ${PORT}`);
});
