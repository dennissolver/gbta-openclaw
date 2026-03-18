/**
 * Shared authentication helper for API routes.
 * Extracts user from Supabase JWT (Authorization header or cookie).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getUser(req) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: 'Supabase not configured' };
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user, error };
  }

  // Try cookie-based auth
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { cookie: req.headers.cookie || '' } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export function requireAuth(handler) {
  return async (req, res) => {
    const { user, error } = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    return handler(req, res);
  };
}
