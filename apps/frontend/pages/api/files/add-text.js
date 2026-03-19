/**
 * POST /api/files/add-text — Save pasted text as a project file
 *
 * Body: { text: string, title: string, projectId: string, sessionKey?: string }
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getUser(req) {
  if (!supabaseUrl) return { user: null };
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const supabase = createClient(supabaseUrl, anonKey);
    const { data: { user } } = await supabase.auth.getUser(token);
    return { user };
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { cookie: req.headers.cookie || '' } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return { user };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { text, title, projectId, sessionKey } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const filename = (title || 'Untitled Text').trim();

  const db = createClient(supabaseUrl, serviceKey);

  const { data: record, error: dbError } = await db
    .from('project_files')
    .insert({
      user_id: user.id,
      project_id: projectId,
      session_key: sessionKey || null,
      filename,
      file_type: 'text/plain',
      file_size: Buffer.byteLength(text, 'utf-8'),
      storage_path: null,
      extracted_text: text.slice(0, 100000),
      source_type: 'text',
    })
    .select('id, filename, file_type, file_size, created_at, extracted_text')
    .single();

  if (dbError) {
    console.error('[add-text] DB insert error:', dbError);
    return res.status(500).json({ error: 'Failed to save text content' });
  }

  return res.status(200).json({
    id: record.id,
    filename: record.filename,
    file_type: record.file_type,
    file_size: record.file_size,
    extracted_text_preview: (record.extracted_text || '').slice(0, 500),
  });
}
