/**
 * GET /api/usage — Returns the current user's message usage for the current month.
 *
 * Response: { used, limit, tier, percentUsed }
 */

import { getUser } from '../../lib/api-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TIER_LIMITS = {
  free: 50,
  pro: 500,
  business: 999999,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Determine tier from profile
  let tier = 'free';
  if (supabaseUrl && serviceKey) {
    try {
      const db = createClient(supabaseUrl, serviceKey);
      const { data: profile } = await db
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single();
      if (profile?.tier) {
        tier = profile.tier;
      }
    } catch (e) {
      console.warn('[usage] Profile lookup failed:', e.message);
    }
  }

  const limit = TIER_LIMITS[tier] || TIER_LIMITS.free;

  // Count user messages for the current month
  let used = 0;
  if (supabaseUrl && serviceKey) {
    try {
      const db = createClient(supabaseUrl, serviceKey);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count, error } = await db
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'user')
        .gte('created_at', startOfMonth);

      if (!error && count !== null) {
        used = count;
      }
    } catch (e) {
      console.warn('[usage] Message count failed:', e.message);
    }
  }

  const percentUsed = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return res.status(200).json({
    used,
    limit,
    tier,
    percentUsed: Math.min(percentUsed, 100),
  });
}
