/**
 * GET /api/agent-files — List or fetch files from the user's agent workspace
 *
 * Query params:
 *   ?filename=<name>  — fetch a specific file's content
 *   (no filename)     — list all workspace files
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
        return res.json({ files: [], status: 'agent_not_provisioned' });
      }
      agentId = profile.openclaw_agent_id;
    } catch (e) {
      console.warn('[agent-files] Profile lookup failed:', e.message);
    }
  }

  const { filename } = req.query;

  try {
    let url;
    if (filename) {
      // Fetch a specific file
      url = `${vpsAdminUrl}/agents/${agentId}/files/${encodeURIComponent(filename)}`;
    } else {
      // List all files
      url = `${vpsAdminUrl}/agents/${agentId}/files`;
    }

    const vpsResp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${vpsAdminToken}`,
      },
    });

    if (!vpsResp.ok) {
      const errData = await vpsResp.json().catch(() => ({}));
      console.error('[agent-files] VPS API error:', errData);
      return res.status(vpsResp.status === 404 ? 404 : 502).json({
        error: errData.error || 'Failed to fetch files from VPS',
      });
    }

    const data = await vpsResp.json();
    return res.json(data);
  } catch (err) {
    console.error('[agent-files] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
