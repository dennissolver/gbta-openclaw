/**
 * POST /api/functions/ghl — GHL integration endpoint for OpenClaw agents
 *
 * Bridge between the SecureGateway function registry and the GHL CRM API.
 * Agents call this to list/create/update contacts, trigger workflows, and
 * manage opportunities in Go High Level.
 *
 * Body: { action: string, params: object }
 * Auth: Supabase Bearer token (same pattern as /api/chat)
 *
 * GHL credentials are loaded from the user_channels table
 * (platform = 'gohighlevel'), matching the config page at
 * apps/frontend/pages/integrations/ghl.jsx.
 */

import { createClient } from '@supabase/supabase-js';

const { createGHLClient, GHLError } = require('../../../shared/integrations/ghl');
const { createDataClassifier } = require('../../../shared/security/data-classifier');
const { createAuditLogger } = require('../../../shared/security/audit-logger');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ============================================================
// Supported Actions
// ============================================================

const VALID_ACTIONS = new Set([
  'list_contacts',
  'get_contact',
  'create_contact',
  'update_contact',
  'trigger_workflow',
  'list_opportunities',
  'create_opportunity',
]);

// ============================================================
// Auth helper (mirrors chat.js)
// ============================================================

async function getUser(req) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: 'Supabase not configured' };
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const key = svcKey || supabaseAnonKey;
    const supabase = createClient(supabaseUrl, key);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (user) return { user, error: null };
    console.warn('[ghl] Token auth failed:', error?.message);
  }

  // Cookie fallback
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { cookie: req.headers.cookie || '' } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

// ============================================================
// Load GHL credentials from user_channels
// ============================================================

/**
 * Fetch the user's GHL API key and location ID from the user_channels table.
 *
 * The GHL config page (ghl.jsx) stores:
 *   - platform: 'gohighlevel'
 *   - config: { locationId }
 *   - The API key is stored via the credential vault (keyed by user/org)
 *
 * For now we also check env vars as a fallback for dev/self-hosted setups.
 *
 * @param {string} userId
 * @returns {Promise<{ apiKey: string, locationId: string } | null>}
 */
async function getGHLCredentials(userId) {
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !svcKey) {
    // Fallback to environment variables (dev mode)
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    if (apiKey && locationId) return { apiKey, locationId };
    return null;
  }

  const db = createClient(supabaseUrl, svcKey);

  try {
    const { data: channel } = await db
      .from('user_channels')
      .select('config')
      .eq('user_id', userId)
      .eq('platform', 'gohighlevel')
      .eq('connected', true)
      .single();

    if (!channel || !channel.config) return null;

    const locationId = channel.config.locationId;
    if (!locationId) return null;

    // API key: try credential vault table, then org-level env, then global env
    // The vault stores keys as GHL_API_KEY_{userId} or GHL_API_KEY_{orgId}
    let apiKey = null;

    // Check vault_secrets table (Supabase Vault / pgsodium)
    try {
      const { data: secret } = await db
        .rpc('vault_read_secret', { secret_name: `GHL_API_KEY_${userId}` });
      if (secret) apiKey = secret;
    } catch (_) {
      // vault RPC may not exist — fall through
    }

    // Fallback: check if API key is in the channel config itself
    // (some setups store it encrypted in config.apiKey)
    if (!apiKey && channel.config.apiKey) {
      apiKey = channel.config.apiKey;
    }

    // Final fallback: environment variable
    if (!apiKey) {
      apiKey = process.env.GHL_API_KEY;
    }

    if (!apiKey) return null;

    return { apiKey, locationId };
  } catch (e) {
    console.warn('[ghl] Failed to load GHL credentials:', e.message);
    return null;
  }
}

// ============================================================
// Action Dispatcher
// ============================================================

/**
 * Execute a GHL action.
 *
 * @param {ReturnType<typeof createGHLClient>} ghl
 * @param {string} action
 * @param {object} params
 * @returns {Promise<{ result: any }>}
 */
async function dispatch(ghl, action, params) {
  switch (action) {
    case 'list_contacts':
      return { result: await ghl.listContacts({ limit: params.limit, query: params.query }) };

    case 'get_contact':
      if (!params.contactId) throw new Error('Missing required param: contactId');
      return { result: await ghl.getContact(params.contactId) };

    case 'create_contact':
      if (!params.name) throw new Error('Missing required param: name');
      return {
        result: await ghl.createContact({
          name: params.name,
          email: params.email,
          phone: params.phone,
          company: params.company,
          source: params.source,
        }),
      };

    case 'update_contact':
      if (!params.contactId) throw new Error('Missing required param: contactId');
      if (!params.data || Object.keys(params.data).length === 0) {
        throw new Error('Missing required param: data (object with fields to update)');
      }
      return { result: await ghl.updateContact(params.contactId, params.data) };

    case 'trigger_workflow':
      if (!params.workflowId) throw new Error('Missing required param: workflowId');
      if (!params.contactId) throw new Error('Missing required param: contactId');
      await ghl.triggerWorkflow(params.workflowId, params.contactId);
      return { result: { success: true, workflowId: params.workflowId, contactId: params.contactId } };

    case 'list_opportunities':
      return { result: await ghl.listOpportunities(params.pipelineId) };

    case 'create_opportunity':
      if (!params.name) throw new Error('Missing required param: name');
      if (!params.pipelineId) throw new Error('Missing required param: pipelineId');
      if (!params.stageId) throw new Error('Missing required param: stageId');
      if (!params.contactId) throw new Error('Missing required param: contactId');
      return {
        result: await ghl.createOpportunity({
          name: params.name,
          pipelineId: params.pipelineId,
          stageId: params.stageId,
          contactId: params.contactId,
          monetaryValue: params.monetaryValue,
        }),
      };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ============================================================
// Handler
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, params } = req.body || {};

  // Validate action
  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'action is required (string)' });
  }
  if (!VALID_ACTIONS.has(action)) {
    return res.status(400).json({
      error: `Invalid action: ${action}`,
      validActions: [...VALID_ACTIONS],
    });
  }

  // Authenticate
  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;

  // Load GHL credentials
  const creds = await getGHLCredentials(userId);
  if (!creds) {
    return res.status(400).json({
      error: 'GHL not configured. Connect Go High Level at /integrations/ghl first.',
    });
  }

  // Data classification — classify outbound contact data before sending to GHL
  const classifier = createDataClassifier();
  if (params && typeof params === 'object') {
    const sensitiveFields = ['name', 'email', 'phone', 'company'];
    for (const field of sensitiveFields) {
      if (params[field] && typeof params[field] === 'string') {
        const classification = classifier.processForLLM(params[field]);
        if (classification.blocked) {
          return res.status(400).json({
            error: `Blocked: ${field} contains sensitive data`,
            reason: classification.blockReason,
          });
        }
      }
    }
  }

  // Execute the action
  const ghl = createGHLClient(creds.apiKey, creds.locationId);

  try {
    const { result } = await dispatch(ghl, action, params || {});

    // Audit log (non-blocking)
    try {
      const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && svcKey) {
        const db = createClient(supabaseUrl, svcKey);

        // Get org context for audit
        const { data: profile } = await db
          .from('profiles')
          .select('org_id')
          .eq('id', userId)
          .single();

        if (profile?.org_id) {
          const auditLogger = createAuditLogger(db, profile.org_id);
          auditLogger.logToolCall(
            'ghl_integration',
            userId,
            `ghl.${action}`,
            true,
            { params: params || {} }
          );
        }
      }
    } catch (auditErr) {
      console.warn('[ghl] Audit log failed:', auditErr.message);
    }

    return res.status(200).json({ ok: true, action, data: result });
  } catch (err) {
    console.error(`[ghl] Action "${action}" failed:`, err.message);

    if (err instanceof GHLError) {
      return res.status(err.status === 401 ? 401 : 502).json({
        error: `GHL API error: ${err.message}`,
        ghlStatus: err.status,
      });
    }

    return res.status(400).json({ error: err.message });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '256kb' },
  },
};
