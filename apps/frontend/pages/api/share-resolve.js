/**
 * GET /api/share-resolve?token=abc123 — Resolve a share token to its data.
 * Public endpoint (no auth required).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const db = createClient(supabaseUrl, serviceKey);
    const { data, error } = await db
      .from('shared_links')
      .select('type, share_data')
      .eq('token', token)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    return res.status(200).json({
      type: data.type,
      ...data.share_data,
    });
  } catch (e) {
    console.error('[share-resolve] Error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
