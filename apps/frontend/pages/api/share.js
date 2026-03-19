/**
 * POST /api/share — Generate a shareable link for a project or achievement.
 *
 * Body: { type: 'project'|'achievement', data: { id, name, description, ... } }
 * Returns: { url, token }
 */

import { getUser } from '../../lib/api-auth';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://gbta-openclaw.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type, data } = req.body || {};
  if (!type || !data) {
    return res.status(400).json({ error: 'type and data are required' });
  }

  const token = crypto.randomBytes(12).toString('base64url');

  if (supabaseUrl && serviceKey) {
    try {
      const db = createClient(supabaseUrl, serviceKey);
      await db.from('shared_links').insert({
        token,
        user_id: user.id,
        type,
        share_data: {
          name: data.name || '',
          description: data.description || '',
          icon: data.icon || '',
          color: data.color || 'brand',
          text: data.text || '',
          stats: data.stats || null,
        },
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[share] Failed to store share link:', e.message);
      // Still return the URL even if DB fails — it just won't resolve later
    }
  }

  const url = `${BASE_URL}/s/${token}`;
  return res.status(200).json({ url, token });
}
