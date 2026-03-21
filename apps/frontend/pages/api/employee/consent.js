/**
 * /api/employee/consent — Manage employee consent
 *
 * GET  — Get current consent status for all types
 * POST — Grant or revoke consent
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
  const { user } = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const db = getServiceClient();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  const { createConsentManager, CONSENT_TYPES } = require('../../../../shared/security/consent-manager');
  const consent = createConsentManager(db);

  // --- GET: Current consent status ---
  if (req.method === 'GET') {
    try {
      const statuses = await consent.getConsentStatus(user.id);
      return res.json({ consents: statuses });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- POST: Grant or revoke ---
  if (req.method === 'POST') {
    const { consentType, granted } = req.body;

    if (!consentType) {
      return res.status(400).json({ error: 'consentType is required' });
    }

    const validTypes = Object.values(CONSENT_TYPES);
    if (!validTypes.includes(consentType)) {
      return res.status(400).json({
        error: `Invalid consentType. Must be one of: ${validTypes.join(', ')}`
      });
    }

    if (typeof granted !== 'boolean') {
      return res.status(400).json({ error: 'granted must be true or false' });
    }

    try {
      if (granted) {
        await consent.grantConsent(user.id, consentType, {
          ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } else {
        await consent.revokeConsent(user.id, consentType);
      }

      // Log the change
      try {
        const { createAuditLogger } = require('../../../../shared/security/audit-logger');
        const { data: profile } = await db
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .single();

        if (profile?.org_id) {
          const logger = createAuditLogger(db, profile.org_id);
          await logger.logConsentChange(user.id, consentType, granted);
        }
      } catch (auditErr) {
        console.warn('[api/employee/consent] Audit log failed (non-blocking):', auditErr.message);
      }

      return res.json({
        status: granted ? 'granted' : 'revoked',
        consentType
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
