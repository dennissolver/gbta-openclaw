/**
 * POST /api/chat — Chat with OpenClaw via HTTP API
 *
 * Uses the OpenAI-compatible /v1/chat/completions endpoint on the gateway.
 * This is a simple HTTP POST (not WebSocket), so it works in Vercel serverless.
 *
 * Body: { message: string, sessionKey?: string, instructions?: string }
 * Auth: Authorization header with Bearer token, or Supabase cookie
 */

import { createClient } from '@supabase/supabase-js';
const { rateLimit } = require('../../lib/rate-limit');

const chatLimiter = rateLimit({ interval: 60000, limit: 30 });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL; // ws://host:port
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

// Convert ws:// URL to http:// for the HTTP API
function gatewayHttpUrl() {
  if (!GATEWAY_URL) return null;
  return GATEWAY_URL.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');
}

async function getUser(req) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: 'Supabase not configured' };
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user, error };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { cookie: req.headers.cookie || '' } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
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
  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Rate limit
  if (!chatLimiter.check(user.id)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  const userId = user.id;

  // Resolve agent ID from profile
  let agentId = 'main';
  if (supabaseUrl) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const db = createClient(supabaseUrl, serviceKey);
        const { data: profile } = await db
          .from('profiles')
          .select('openclaw_agent_id')
          .eq('id', userId)
          .single();
        if (profile?.openclaw_agent_id) {
          agentId = profile.openclaw_agent_id;
        }
      }
    } catch (e) {
      console.warn('[chat] Profile lookup failed:', e.message);
    }
  }

  // Build messages array
  const messages = [];
  if (instructions && typeof instructions === 'string' && instructions.trim()) {
    messages.push({ role: 'system', content: instructions.trim() });
  }
  messages.push({ role: 'user', content: message.trim() });

  // Build session key for the header
  const sessionKey = explicitSessionKey || `agent:${agentId}:web:${userId}`;

  const httpUrl = gatewayHttpUrl();
  if (!httpUrl) {
    // Mock mode — no gateway configured
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
    });
    res.write(`data: ${JSON.stringify({ state: 'delta', message: 'OpenClaw gateway is not configured. This is a mock response.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ state: 'final', message: 'OpenClaw gateway is not configured. This is a mock response.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ state: 'done' })}\n\n`);
    return res.end();
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let closed = false;
  req.on('close', () => { closed = true; });

  try {
    // Call the OpenAI-compatible HTTP endpoint on the gateway
    const completionUrl = `${httpUrl}/v1/chat/completions`;
    console.log('[chat] Calling:', completionUrl, 'agent:', agentId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const gatewayResp = await fetch(completionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'x-openclaw-agent-id': agentId,
        'x-openclaw-session-key': sessionKey,
      },
      body: JSON.stringify({
        model: `openclaw:${agentId}`,
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!gatewayResp.ok) {
      const errText = await gatewayResp.text();
      console.error('[chat] Gateway error:', gatewayResp.status, errText);
      if (!closed) {
        res.write(`data: ${JSON.stringify({ state: 'error', errorMessage: `Gateway error: ${gatewayResp.status}` })}\n\n`);
      }
    } else {
      const data = await gatewayResp.json();
      const content = data.choices?.[0]?.message?.content || '';

      if (!closed) {
        // Send as delta then final (frontend expects this pattern)
        res.write(`data: ${JSON.stringify({ state: 'delta', message: content })}\n\n`);
        res.write(`data: ${JSON.stringify({ state: 'final', message: content })}\n\n`);
      }
    }
  } catch (err) {
    console.error('[chat] Error:', err.message);
    if (!closed) {
      res.write(`data: ${JSON.stringify({ state: 'error', errorMessage: err.message || 'Unknown error' })}\n\n`);
    }
  }

  if (!closed) {
    res.write(`data: ${JSON.stringify({ state: 'done' })}\n\n`);
    res.end();
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};
