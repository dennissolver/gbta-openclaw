/**
 * /api/projects — CRUD for user projects
 *
 * GET    → list user's projects
 * POST   → create a project
 * PATCH  → update a project
 * DELETE → delete a project
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getAuthenticatedUser(req) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: { id: 'local-dev-user' }, supabase: null };
  }

  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const key = svcKey || supabaseAnonKey;
    const supabase = createClient(supabaseUrl, key);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (user) return { user, supabase };
    if (error) return { user: null, supabase: null };
  }

  // Try cookie-based auth
  const sbCookie = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { cookie: req.headers.cookie || '' } },
  });
  const { data: { user }, error } = await sbCookie.auth.getUser();
  if (error || !user) return { user: null, supabase: null };
  return { user, supabase: sbCookie };
}

function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

export default async function handler(req, res) {
  const { user } = await getAuthenticatedUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getServiceClient();

  // In dev without Supabase, return mock data
  if (!db) {
    if (req.method === 'GET') {
      return res.json({ projects: [] });
    }
    return res.json({ ok: true, project: { id: 'mock-' + Date.now(), ...req.body } });
  }

  const userId = user.id;

  switch (req.method) {
    case 'GET': {
      const { data, error } = await db
        .from('projects')
        .select('*, project_sessions(count)')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch projects:', error);
        return res.status(500).json({ error: 'Failed to fetch projects' });
      }

      // Flatten session count
      const projects = (data || []).map(p => ({
        ...p,
        session_count: p.project_sessions?.[0]?.count || 0,
        project_sessions: undefined,
      }));

      return res.json({ projects });
    }

    case 'POST': {
      const { name, description, icon, color, instructions, functions: funcs } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name is required' });
      }

      const { data, error } = await db
        .from('projects')
        .insert({
          user_id: userId,
          name: name.trim(),
          description: (description || '').trim(),
          icon: icon || '\ud83d\udcc1',
          color: color || 'brand',
          instructions: (instructions || '').trim(),
          functions: funcs || [],
          pinned: false,
          archived: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create project:', error);
        return res.status(500).json({ error: 'Failed to create project' });
      }

      return res.status(201).json({ project: data });
    }

    case 'PATCH': {
      const { id, ...updates } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      // Only allow certain fields
      const allowed = ['name', 'description', 'icon', 'color', 'instructions', 'functions', 'pinned', 'archived'];
      const clean = {};
      for (const key of allowed) {
        if (key in updates) clean[key] = updates[key];
      }
      clean.updated_at = new Date().toISOString();

      const { data, error } = await db
        .from('projects')
        .update(clean)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update project:', error);
        return res.status(500).json({ error: 'Failed to update project' });
      }

      return res.json({ project: data });
    }

    case 'DELETE': {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      // Delete sessions first
      await db
        .from('project_sessions')
        .delete()
        .eq('project_id', id)
        .eq('user_id', userId);

      const { error } = await db
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete project:', error);
        return res.status(500).json({ error: 'Failed to delete project' });
      }

      return res.json({ ok: true });
    }

    default:
      res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
