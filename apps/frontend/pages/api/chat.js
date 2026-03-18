/**
 * POST /api/chat — SSE endpoint for streaming chat with OpenClaw gateway
 *
 * Body: { message: string, sessionKey?: string }
 * Auth: Authorization header with Bearer token, or Supabase cookie
 *
 * Streams back Server-Sent Events with chat deltas/final/error.
 */

import { createClient } from '@supabase/supabase-js';

const openclaw = require('../../lib/openclaw-client');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Extract authenticated user from the request.
 * Returns { user, error }.
 */
async function getUser(req) {
  if (!supabaseUrl || !supabaseAnonKey) {
    // No Supabase configured — return a mock user for local dev
    return { user: { id: 'local-dev-user' }, error: null };
  }

  // Try Authorization header first
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    // Try cookie-based auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { cookie: req.headers.cookie || '' } },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return { user, error };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, sessionKey: explicitSessionKey, instructions } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Authenticate
  const { user, error: authError } = await getUser(req);
  if (!user) {
    // In dev without Supabase, allow anonymous
    if (!supabaseUrl) {
      // fall through with mock user
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const userId = user?.id || 'anonymous';

  // Resolve the user's agent ID from their profile (if provisioned)
  let agentId = null;
  if (supabaseUrl && supabaseAnonKey && userId !== 'anonymous') {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const db = createClient(supabaseUrl, serviceKey);
        const { data: profile } = await db
          .from('profiles')
          .select('openclaw_agent_id, agent_provisioned')
          .eq('id', userId)
          .single();
        if (profile?.agent_provisioned && profile?.openclaw_agent_id) {
          agentId = profile.openclaw_agent_id;
        }
      }
    } catch (e) {
      console.warn('[chat] Profile lookup failed (non-blocking):', e.message);
    }
  }

  const sessionKey = explicitSessionKey || openclaw.sessionKeyForUser(userId, agentId);

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Helper to send SSE event
  function sendSSE(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Track if the connection is still open
  let closed = false;
  req.on('close', () => { closed = true; });

  // Prepend project instructions if provided
  const fullMessage = instructions && typeof instructions === 'string' && instructions.trim()
    ? `[System Context: ${instructions.trim()}]\n\nUser: ${message.trim()}`
    : message.trim();

  try {
    await openclaw.sendMessageStream(sessionKey, fullMessage, (event) => {
      if (closed) return;
      // Normalize: gateway sends message as {role, content} object,
      // but frontend expects message as a plain string
      const normalized = { ...event };
      if (normalized.message && typeof normalized.message === 'object') {
        normalized.message = normalized.message.content || '';
      }
      sendSSE(normalized);
    });
  } catch (err) {
    if (!closed) {
      sendSSE({
        state: 'error',
        errorMessage: err.message || 'Unknown error',
      });
    }
  }

  if (!closed) {
    // Send a final done marker
    sendSSE({ state: 'done' });
    res.end();
  }
}

// Disable body parsing limit for streaming
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
