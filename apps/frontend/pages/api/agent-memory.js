/**
 * GET /api/agent-memory — Fetch the user's agent memory files
 *
 * Authenticates the user, reads their agent ID from the profile,
 * and calls the VPS admin API to retrieve memory entries.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vpsAdminUrl = process.env.VPS_ADMIN_URL || 'http://170.64.186.98:18790';
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;
  const db = getServiceClient();

  // Get agent ID from profile
  let agentId = `user-${userId}`;
  if (db) {
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('openclaw_agent_id, agent_provisioned')
        .eq('id', userId)
        .single();

      if (!profile?.agent_provisioned || !profile?.openclaw_agent_id) {
        return res.json({ memories: [], status: 'agent_not_provisioned' });
      }
      agentId = profile.openclaw_agent_id;
    } catch (e) {
      console.warn('[agent-memory] Profile lookup failed:', e.message);
    }
  }

  // Call VPS admin API
  try {
    const vpsResp = await fetch(`${vpsAdminUrl}/agents/${agentId}/memory`, {
      headers: {
        'Authorization': `Bearer ${vpsAdminToken}`,
      },
    });

    if (!vpsResp.ok) {
      const errData = await vpsResp.json().catch(() => ({}));
      console.error('[agent-memory] VPS API error:', errData);
      return res.status(502).json({ error: 'Failed to fetch memory from VPS' });
    }

    const data = await vpsResp.json();
    return res.json({
      memories: data.memories || [],
      agentId,
    });
  } catch (err) {
    console.error('[agent-memory] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
