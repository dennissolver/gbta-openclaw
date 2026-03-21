/**
 * GET /api/employee/my-agents — Get the authenticated employee's agent pair
 *
 * POST /api/employee/my-agents — Pause/resume activity tracking
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vpsAdminUrl = process.env.VPS_ADMIN_URL;
const vpsAdminToken = process.env.VPS_ADMIN_TOKEN || '';

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
  const { user } = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const db = getServiceClient();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  const { data: profile } = await db
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) return res.status(403).json({ error: 'No organisation assigned' });

  // --- GET: My agents ---
  if (req.method === 'GET') {
    const { createAgentProvisioner } = require('../../../shared/agents/provisioner');
    const provisioner = createAgentProvisioner(db, vpsAdminUrl, vpsAdminToken);

    try {
      const agents = await provisioner.getAgents(profile.org_id, user.id);

      // Also get consent status
      const { createConsentManager } = require('../../../shared/security/consent-manager');
      const consent = createConsentManager(db);
      const consents = await consent.getConsentStatus(user.id);

      return res.json({
        agents,
        consents
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- POST: Pause/resume tracking ---
  if (req.method === 'POST') {
    const { action, pauseUntil } = req.body;

    if (action === 'pause') {
      // Temporarily revoke activity_tracking consent
      const { createConsentManager } = require('../../../shared/security/consent-manager');
      const consent = createConsentManager(db);

      await consent.revokeConsent(user.id, 'activity_tracking');

      // If pauseUntil is set, we'd schedule a re-grant — for now just revoke
      return res.json({
        status: 'paused',
        message: pauseUntil
          ? `Activity tracking paused until ${pauseUntil}. You'll need to re-enable it manually.`
          : 'Activity tracking paused. Re-enable it from your consent settings.'
      });
    }

    if (action === 'resume') {
      const { createConsentManager } = require('../../../shared/security/consent-manager');
      const consent = createConsentManager(db);

      await consent.grantConsent(user.id, 'activity_tracking', {
        ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.json({ status: 'resumed' });
    }

    return res.status(400).json({ error: 'action must be "pause" or "resume"' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
