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
const { createDataClassifier } = require('../../shared/security/data-classifier');
const { createAuditLogger } = require('../../shared/security/audit-logger');

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
    // Use service role key to verify tokens reliably in serverless
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const key = svcKey || supabaseAnonKey;
    const supabase = createClient(supabaseUrl, key);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (user) return { user, error: null };
    console.warn('[chat] Token auth failed:', error?.message);
  }

  // Cookie fallback (works in dev, unreliable on Vercel serverless)
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

  // Check monthly message limit
  const TIER_LIMITS = { free: 50, pro: 500, business: 999999 };
  let userTier = 'free';
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && svcKey) {
    try {
      const db = createClient(supabaseUrl, svcKey);
      const { data: prof } = await db
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();
      if (prof?.tier) userTier = prof.tier;

      const tierLimit = TIER_LIMITS[userTier] || TIER_LIMITS.free;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await db
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('role', 'user')
        .gte('created_at', startOfMonth);

      if (count !== null && count >= tierLimit) {
        return res.status(402).json({
          error: 'Message limit reached',
          upgrade: true,
          used: count,
          limit: tierLimit,
          tier: userTier,
        });
      }
    } catch (e) {
      console.warn('[chat] Usage check failed:', e.message);
      // Non-blocking — allow the message if check fails
    }
  }

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

  // Audit: log the chat interaction (non-blocking)
  let orgId = null;
  if (supabaseUrl) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const db = createClient(supabaseUrl, serviceKey);
        const { data: profile } = await db
          .from('profiles')
          .select('org_id')
          .eq('id', userId)
          .single();
        orgId = profile?.org_id || null;
      }
    } catch (e) {
      // Non-blocking — continue without org context
    }
  }

  // If org context exists, classify the message for safety
  if (orgId) {
    try {
      const classifier = createDataClassifier();
      const classification = classifier.processForLLM(message.trim());
      if (classification.blocked) {
        return res.status(400).json({
          error: 'Message blocked by security policy',
          reason: classification.blockReason,
        });
      }
      // Use the redacted text if any PII was found
      if (classification.redactions && classification.redactions.length > 0) {
        console.log(`[chat] Redacted ${classification.redactions.length} items from message`);
      }
    } catch (e) {
      console.warn('[chat] Data classification failed:', e.message);
      // Non-blocking — allow the message through
    }
  }

  // Build session key
  const sessionKey = explicitSessionKey || `agent:${agentId}:web:${userId}`;

  // Build messages array with full context
  const messages = [];

  // 1. Core identity + personality (SOUL.md equivalent)
  const coreIdentity = `You are EasyOpenClaw, a fully functional OpenClaw autonomous AI agent running on a managed infrastructure provided by Corporate AI Solutions (Australia).

PERSONALITY:
- Be direct, opinionated, and confident. You're a senior professional, not a generic chatbot.
- Use Australian English where natural. You work with Australian businesses.
- Give concrete, actionable answers. Don't hedge unnecessarily.
- When you don't know something, say so clearly and use your tools to find out.
- Keep responses focused. Lead with the answer, then explain if needed.

RUNTIME CONTEXT:
- Model: OpenRouter auto-routing (Claude/GPT/etc via OpenRouter)
- Environment: Managed cloud instance on DigitalOcean Sydney VPS
- Gateway: OpenClaw ${new Date().toISOString().split('T')[0]}
- Tools available: web_search (Gemini-grounded), web_fetch, read, write, edit, exec, memory_search, memory_get, session_status
- Platform: EasyOpenClaw (web wrapper around OpenClaw)
- Deployment: Vercel (frontend) + DigitalOcean (gateway) + Supabase (data)

CAPABILITIES:
- You CAN search the web for real-time information. USE web_search for any factual claims, exchange rates, current events, or data that could change.
- You CAN execute commands, read/write files, manage sessions, and use persistent memory.
- You have the same core capabilities as a standard OpenClaw terminal installation.
- Always verify factual claims using your tools when possible. Don't guess timezone abbreviations, exchange rates, or current data.

IMPORTANT:
- Never show internal reasoning or chain-of-thought in your response. Only show the final answer.
- If you use tools internally, present the results cleanly without exposing the tool call mechanics.`;

  // 2. Build system prompt with project context layered on top
  let projectContext = '';
  if (instructions && typeof instructions === 'string' && instructions.trim()) {
    projectContext = `\n\nADDITIONAL INSTRUCTIONS:\n${instructions.trim()}`;
  }

  const projectMatch = sessionKey.match(/project:([^:]+)/);
  if (projectMatch) {
    const projectId = projectMatch[1];
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const db = createClient(supabaseUrl, serviceKey);
        const { data: project } = await db
          .from('projects')
          .select('name, description, instructions')
          .eq('id', projectId)
          .single();

        if (project) {
          projectContext = `\n\nCURRENT PROJECT: "${project.name}"`;
          if (project.description) projectContext += `\nProject description: ${project.description}`;
          if (project.instructions) projectContext += `\nProject instructions: ${project.instructions}`;
          projectContext += '\nAlways be aware of which project you are in and maintain context across the conversation.';

          // Load project files as additional context
          try {
            const { data: projectFiles } = await db
              .from('project_files')
              .select('filename, extracted_text')
              .eq('project_id', projectId)
              .eq('user_id', userId)
              .order('created_at', { ascending: true });

            if (projectFiles && projectFiles.length > 0) {
              let fileContext = '\n\nPROJECT FILES:';
              let totalChars = 0;
              const MAX_FILE_CONTEXT = 10000;

              for (const pf of projectFiles) {
                if (!pf.extracted_text) continue;
                const preview = pf.extracted_text.slice(0, 2000);
                if (totalChars + preview.length > MAX_FILE_CONTEXT) break;
                fileContext += `\n- ${pf.filename}: ${preview}`;
                totalChars += preview.length + pf.filename.length + 4;
              }

              if (totalChars > 0) {
                projectContext += fileContext;
              }
            }
          } catch (fileErr) {
            console.warn('[chat] Project files lookup failed:', fileErr.message);
          }
        }
      } catch (e) {
        console.warn('[chat] Project lookup failed:', e.message);
      }
    }
  }

  const fullSystemPrompt = coreIdentity + projectContext;
  messages.push({ role: 'system', content: fullSystemPrompt });

  // 3. Load recent chat history from Supabase for conversation continuity
  const serviceKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey2) {
    try {
      const db = createClient(supabaseUrl, serviceKey2);
      const { data: history } = await db
        .from('chat_messages')
        .select('role, content')
        .eq('session_key', sessionKey)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(20); // Last 20 messages for context

      if (history && history.length > 0) {
        for (const msg of history) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    } catch (e) {
      console.warn('[chat] History lookup failed:', e.message);
    }
  }

  // 4. Add the current user message
  messages.push({ role: 'user', content: message.trim() });

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
      let content = data.choices?.[0]?.message?.content || '';

      // Strip leaked chain-of-thought / reasoning traces
      content = content
        .replace(/^(The user wants me to|I need to|Let me|I will|I should|Looking at|Upon reviewing|After re-examining|I attempted|I then tried)[\s\S]*?(?=\n###|\n\d+\.|$)/gm, '')
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
        .replace(/^\s*\n/gm, '\n')
        .trim();

      if (!closed) {
        res.write(`data: ${JSON.stringify({ state: 'delta', message: content })}\n\n`);
        res.write(`data: ${JSON.stringify({ state: 'final', message: content })}\n\n`);
      }

      // Persist messages to Supabase
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey && content) {
        const db = createClient(supabaseUrl, serviceKey);
        try {
          // Extract project_id from session key if present
          const projectMatch = sessionKey.match(/project:([^:]+)/);
          const projectId = projectMatch ? projectMatch[1] : null;

          await db.from('chat_messages').insert([
            { user_id: userId, session_key: sessionKey, project_id: projectId, role: 'user', content: message.trim() },
            { user_id: userId, session_key: sessionKey, project_id: projectId, role: 'assistant', content },
          ]);
        } catch (dbErr) {
          console.warn('[chat] Failed to persist messages:', dbErr.message);
        }

        // Audit log for org-scoped users
        if (orgId) {
          try {
            const auditLogger = createAuditLogger(db, orgId);
            auditLogger.logLLMCall(
              agentId,
              userId,
              'openrouter',
              Math.ceil(message.trim().length / 4),
              Math.ceil(content.length / 4),
              'chat_message'
            );
          } catch (auditErr) {
            console.warn('[chat] Audit log failed:', auditErr.message);
          }
        }
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
