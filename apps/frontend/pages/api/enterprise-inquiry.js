/**
 * POST /api/enterprise-inquiry — Store an enterprise sales inquiry.
 *
 * Body: { name, email, company, teamSize, message }
 * Returns: { success: true }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, teamSize, message } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (supabaseUrl && serviceKey) {
    try {
      const db = createClient(supabaseUrl, serviceKey);
      const { error } = await db.from('enterprise_inquiries').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: (company || '').trim(),
        team_size: teamSize || null,
        message: (message || '').trim(),
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[enterprise-inquiry] Insert failed:', error.message);
        return res.status(500).json({ error: 'Failed to submit inquiry' });
      }
    } catch (e) {
      console.error('[enterprise-inquiry] Error:', e.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(200).json({ success: true });
}
