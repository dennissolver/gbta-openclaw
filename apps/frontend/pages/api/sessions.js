/**
 * /api/sessions — Manage OpenClaw chat sessions
 *
 * GET: List sessions for the authenticated user
 * POST: Create/reset a session { sessionKey?, reason? }
 * DELETE: Reset a session { sessionKey }
 */

import { createClient } from '@supabase/supabase-js';

const openclaw = require('../../lib/openclaw-client');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getUser(req) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: { id: 'local-dev-user' }, error: null };
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
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
  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;

  // Resolve agent ID from profile
  let agentId = null;
  if (supabaseUrl && supabaseAnonKey) {
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
      // Non-blocking — fall back to main agent
    }
  }

  const agentPrefix = agentId || 'main';

  switch (req.method) {
    case 'GET': {
      try {
        const result = await openclaw.listSessions(50);
        // Filter sessions to only those belonging to this user's agent
        const userPrefix = `agent:${agentPrefix}:web:${userId}`;
        const sessions = (result.sessions || []).filter(s =>
          s.key?.startsWith(userPrefix)
        );
        return res.json({ sessions });
      } catch (err) {
        console.error('[sessions] List error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    case 'POST': {
      const { sessionKey, reason = 'new' } = req.body || {};
      const key = sessionKey || openclaw.sessionKeyForUser(userId, agentId);
      try {
        const result = await openclaw.resetSession(key, reason);
        return res.json(result);
      } catch (err) {
        console.error('[sessions] Create/reset error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    case 'DELETE': {
      const { sessionKey } = req.body || {};
      if (!sessionKey) {
        return res.status(400).json({ error: 'sessionKey is required' });
      }
      // Verify the session belongs to this user
      const userPrefix = `agent:${agentPrefix}:web:${userId}`;
      if (!sessionKey.startsWith(userPrefix)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      try {
        const result = await openclaw.resetSession(sessionKey, 'reset');
        return res.json(result);
      } catch (err) {
        console.error('[sessions] Delete error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    default:
      res.setHeader('Allow', 'GET, POST, DELETE');
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
