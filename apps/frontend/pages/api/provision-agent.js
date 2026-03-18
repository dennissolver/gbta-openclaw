/**
 * POST /api/provision-agent — Provision an OpenClaw agent for the authenticated user
 *
 * 1. Authenticates user via Supabase
 * 2. Checks if agent already provisioned (profiles.agent_provisioned)
 * 3. Calls VPS admin API to create the agent
 * 4. Updates Supabase profile with agent details
 * 5. Returns { agentId, status: "provisioned" }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vpsAdminUrl = process.env.VPS_ADMIN_URL;
const vpsAdminToken = process.env.VPS_ADMIN_TOKEN || '';

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

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const { user, error: authError } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;
  const agentId = `user-${userId}`;
  const db = getServiceClient();

  // Check if already provisioned
  if (db) {
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('agent_provisioned, openclaw_agent_id')
        .eq('id', userId)
        .single();

      if (profile?.agent_provisioned && profile?.openclaw_agent_id) {
        return res.json({
          agentId: profile.openclaw_agent_id,
          status: 'already_provisioned',
        });
      }
    } catch (e) {
      console.warn('[provision-agent] Profile check failed (non-blocking):', e.message);
    }
  }

  // Provision: use shared 'main' agent for MVP
  // Per-user agent isolation will be added once VPS networking is configured
  const effectiveAgentId = 'main';

  // Try VPS admin API for per-user agent (non-blocking, best-effort)
  if (vpsAdminUrl && vpsAdminToken) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const vpsResp = await fetch(`${vpsAdminUrl}/agents/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vpsAdminToken}`,
        },
        body: JSON.stringify({ agentId, model: 'openrouter/auto' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (vpsResp.ok) {
        console.log('[provision-agent] Per-user agent created on VPS:', agentId);
        // Use the per-user agent if VPS provisioning succeeded
        if (db) {
          await db.from('profiles').update({
            openclaw_agent_id: agentId,
            agent_provisioned: true,
            agent_provisioned_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', userId);
        }
        return res.json({ agentId, status: 'provisioned' });
      }
    } catch (vpsErr) {
      console.warn('[provision-agent] VPS unreachable, falling back to shared agent:', vpsErr.message);
    }
  }

  // Fallback: mark as provisioned with shared 'main' agent
  if (db) {
    try {
      await db.from('profiles').update({
        openclaw_agent_id: effectiveAgentId,
        agent_provisioned: true,
        agent_provisioned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    } catch (e) {
      console.warn('[provision-agent] Profile update failed (non-blocking):', e.message);
    }
  }

  return res.json({
    agentId: effectiveAgentId,
    status: 'provisioned',
    shared: true,
  });
}
