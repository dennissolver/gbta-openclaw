/**
 * /api/project-sessions — CRUD for sessions within a project
 *
 * GET    → list sessions for a project (query: projectId)
 * POST   → create a session within a project
 * PATCH  → update a session (title, last_message)
 * DELETE → delete a session
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getAuthenticatedUser(req) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: { id: 'local-dev-user' } };
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    return { user };
  }

  const sbCookie = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { cookie: req.headers.cookie || '' } },
  });
  const { data: { user } } = await sbCookie.auth.getUser();
  return { user };
}

function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

export default async function handler(req, res) {
  const { user } = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const db = getServiceClient();
  if (!db) {
    if (req.method === 'GET') return res.json({ sessions: [] });
    return res.json({ ok: true, session: { id: 'mock-' + Date.now(), ...req.body } });
  }

  const userId = user.id;

  switch (req.method) {
    case 'GET': {
      const projectId = req.query.projectId;
      if (!projectId) return res.status(400).json({ error: 'projectId is required' });

      const { data, error } = await db
        .from('project_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch project sessions:', error);
        return res.status(500).json({ error: 'Failed to fetch sessions' });
      }

      return res.json({ sessions: data || [] });
    }

    case 'POST': {
      const { projectId, sessionKey, title } = req.body;
      if (!projectId || !sessionKey) {
        return res.status(400).json({ error: 'projectId and sessionKey are required' });
      }

      const { data, error } = await db
        .from('project_sessions')
        .insert({
          project_id: projectId,
          user_id: userId,
          session_key: sessionKey,
          title: title || 'New Session',
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create project session:', error);
        return res.status(500).json({ error: 'Failed to create session' });
      }

      return res.status(201).json({ session: data });
    }

    case 'PATCH': {
      const { id, title, last_message } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      const updates = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (last_message !== undefined) updates.last_message = last_message;

      const { data, error } = await db
        .from('project_sessions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update project session:', error);
        return res.status(500).json({ error: 'Failed to update session' });
      }

      return res.json({ session: data });
    }

    case 'DELETE': {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      const { error } = await db
        .from('project_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete project session:', error);
        return res.status(500).json({ error: 'Failed to delete session' });
      }

      return res.json({ ok: true });
    }

    default:
      res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
