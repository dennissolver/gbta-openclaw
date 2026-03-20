/**
 * GET /api/files/list — List files for a project or session
 *
 * Query params:
 * - projectId: list files for this project
 * - sessionKey: list files for this session (optional alternative)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getUser(req) {
  if (!supabaseUrl || !serviceKey) return { user: null };
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) return { user };
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey) {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { cookie: req.headers.cookie || '' } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    return { user };
  }
  return { user: null };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { projectId, sessionKey } = req.query;

  if (!projectId && !sessionKey) {
    return res.status(400).json({ error: 'projectId or sessionKey is required' });
  }

  const db = createClient(supabaseUrl, serviceKey);

  let query = db
    .from('project_files')
    .select('id, filename, file_type, file_size, source_type, source_url, created_at, extracted_text, storage_path')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  if (sessionKey) {
    query = query.eq('session_key', sessionKey);
  }

  const { data: files, error } = await query;

  if (error) {
    console.error('[files/list] Query error:', error);
    return res.status(500).json({ error: 'Failed to list files' });
  }

  const result = (files || []).map((f) => ({
    id: f.id,
    filename: f.filename,
    file_type: f.file_type,
    file_size: f.file_size,
    source_type: f.source_type,
    source_url: f.source_url,
    created_at: f.created_at,
    storage_path: f.storage_path,
    has_extracted_text: !!(f.extracted_text && f.extracted_text.trim()),
    extracted_text_preview: f.extracted_text ? f.extracted_text.slice(0, 300) : null,
  }));

  return res.status(200).json({ files: result });
}
