/**
 * GET /api/history?sessionKey=...&limit=50 — Fetch chat history from Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { cookie: req.headers.cookie || '' } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
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

  // Read from Supabase
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.json({ messages: [] });
  }

  try {
    const db = createClient(supabaseUrl, serviceKey);
    const { data, error } = await db
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('session_key', sessionKey)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(parseInt(limit, 10));

    if (error) {
      console.error('[history] Supabase error:', error.message);
      return res.json({ messages: [] });
    }

    const messages = (data || []).map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.created_at,
    }));

    return res.json({ messages });
  } catch (err) {
    console.error('[history] Error:', err.message);
    return res.json({ messages: [] });
  }
}
