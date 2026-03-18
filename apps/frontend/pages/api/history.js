/**
 * GET /api/history?sessionKey=...&limit=50 — Fetch chat history for a session
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;
  const { sessionKey, limit = '50' } = req.query;

  if (!sessionKey) {
    return res.status(400).json({ error: 'sessionKey query parameter is required' });
  }

  // Verify the session belongs to this user
  const userPrefix = `agent:main:web:${userId}`;
  if (!sessionKey.startsWith(userPrefix)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await openclaw.getHistory(sessionKey, parseInt(limit, 10));
    return res.json(result);
  } catch (err) {
    console.error('[history] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
