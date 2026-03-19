/**
 * DELETE /api/files/delete — Delete a project file
 *
 * Body: { fileId: string }
 * Deletes from both Supabase Storage and project_files table.
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
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { user } = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { fileId } = req.body || {};
  if (!fileId) {
    return res.status(400).json({ error: 'fileId is required' });
  }

  const db = createClient(supabaseUrl, serviceKey);

  // Fetch the file record to validate ownership and get storage path
  const { data: file, error: fetchError } = await db
    .from('project_files')
    .select('id, user_id, storage_path, source_type')
    .eq('id', fileId)
    .single();

  if (fetchError || !file) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (file.user_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Delete from Supabase Storage if it has a storage path (uploads only)
  if (file.storage_path && file.source_type === 'upload') {
    const { error: storageError } = await db.storage
      .from('project-files')
      .remove([file.storage_path]);

    if (storageError) {
      console.warn('[files/delete] Storage delete failed:', storageError.message);
      // Continue to delete the record anyway
    }
  }

  // Delete from project_files table
  const { error: deleteError } = await db
    .from('project_files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('[files/delete] DB delete error:', deleteError);
    return res.status(500).json({ error: 'Failed to delete file record' });
  }

  return res.status(200).json({ success: true });
}
