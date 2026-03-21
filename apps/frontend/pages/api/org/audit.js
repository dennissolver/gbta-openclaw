/**
 * GET /api/org/audit — Query agent audit log (admin only)
 *
 * Query params: agentId, userId, action, resource, from, to, limit
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUser(req) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: { id: 'local-dev-user' } };
  }
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const key = token ? (supabaseServiceKey || supabaseAnonKey) : supabaseAnonKey;
  const opts = token ? {} : { global: { headers: { cookie: req.headers.cookie || '' } } };
  const supabase = createClient(supabaseUrl, key, opts);
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  return { user };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user } = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const db = getServiceClient();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  // Check admin role
  const { data: profile } = await db
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) return res.status(403).json({ error: 'No organisation assigned' });
  if (!['owner', 'admin'].includes(profile.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { createAuditLogger } = require('../../../../shared/security/audit-logger');
  const logger = createAuditLogger(db, profile.org_id);

  const { agentId, userId, action, resource, from, to, limit } = req.query;

  try {
    const entries = await logger.query({
      agentId: agentId || undefined,
      userId: userId || undefined,
      action: action || undefined,
      resource: resource || undefined,
      from: from || undefined,
      to: to || undefined,
      limit: limit ? parseInt(limit, 10) : 100
    });

    return res.json({ entries, count: entries.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
