/**
 * /api/org/agents — Manage org agent pairs
 *
 * POST   — Provision assistant+coach pair for an employee (admin only)
 * DELETE — Deprovision agent pair (admin only)
 * GET    — List all agents in org (admin/manager)
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

async function getUserProfile(db, userId) {
  const { data } = await db
    .from('profiles')
    .select('id, org_id, role')
    .eq('id', userId)
    .single();
  return data;
}

export default async function handler(req, res) {
  const { user } = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const db = getServiceClient();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  const profile = await getUserProfile(db, user.id);
  if (!profile?.org_id) return res.status(403).json({ error: 'No organisation assigned' });

  // --- POST: Provision agent pair ---
  if (req.method === 'POST') {
    if (!['owner', 'admin'].includes(profile.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { employeeUserId, employeeName, roleDescription } = req.body;
    if (!employeeUserId) {
      return res.status(400).json({ error: 'employeeUserId is required' });
    }

    // Verify employee is in same org
    const emp = await getUserProfile(db, employeeUserId);
    if (!emp || emp.org_id !== profile.org_id) {
      return res.status(404).json({ error: 'Employee not found in your organisation' });
    }

    try {
      const { createAgentProvisioner } = require('../../../shared/agents/provisioner');
      const provisioner = createAgentProvisioner(db, vpsAdminUrl, vpsAdminToken);
      const result = await provisioner.provisionPair(profile.org_id, employeeUserId, {
        name: employeeName,
        roleDescription
      });
      return res.json({ status: 'provisioned', agents: result });
    } catch (err) {
      console.error('[api/org/agents] Provision failed:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // --- DELETE: Deprovision agent pair ---
  if (req.method === 'DELETE') {
    if (!['owner', 'admin'].includes(profile.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { employeeUserId } = req.body;
    if (!employeeUserId) {
      return res.status(400).json({ error: 'employeeUserId is required' });
    }

    try {
      const { createAgentProvisioner } = require('../../../shared/agents/provisioner');
      const provisioner = createAgentProvisioner(db, vpsAdminUrl, vpsAdminToken);
      await provisioner.deprovision(profile.org_id, employeeUserId);
      return res.json({ status: 'deprovisioned' });
    } catch (err) {
      console.error('[api/org/agents] Deprovision failed:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // --- GET: List agents ---
  if (req.method === 'GET') {
    if (!['owner', 'admin', 'manager'].includes(profile.role)) {
      return res.status(403).json({ error: 'Manager access required' });
    }

    const { activeOnly, agentRole } = req.query;

    try {
      const { createAgentProvisioner } = require('../../../shared/agents/provisioner');
      const provisioner = createAgentProvisioner(db, vpsAdminUrl, vpsAdminToken);
      const agents = await provisioner.listAgents(profile.org_id, {
        activeOnly: activeOnly !== 'false',
        agentRole: agentRole || undefined
      });
      return res.json({ agents });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
