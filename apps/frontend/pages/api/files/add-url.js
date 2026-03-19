/**
 * POST /api/files/add-url — Fetch a URL and save its text content
 *
 * Body: { url: string, projectId: string, sessionKey?: string }
 * Fetches HTML from the URL, extracts text, saves to project_files.
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

function extractTextFromHtml(html) {
  // Simple HTML-to-text: strip tags, decode basic entities, collapse whitespace
  let text = html
    // Remove script and style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Replace block elements with newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n')
    .replace(/<br[^>]*\/?>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
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

  const { url, projectId, sessionKey } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL. Must be http or https.' });
  }

  // Fetch the URL
  let htmlContent;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenClaw/1.0)',
        'Accept': 'text/html,application/xhtml+xml,text/plain,*/*',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return res.status(400).json({ error: `Failed to fetch URL: HTTP ${resp.status}` });
    }

    htmlContent = await resp.text();
  } catch (err) {
    return res.status(400).json({ error: 'Failed to fetch URL: ' + err.message });
  }

  // Extract text
  const contentType = '';
  const extractedText = extractTextFromHtml(htmlContent);

  if (!extractedText) {
    return res.status(400).json({ error: 'No text content could be extracted from this URL' });
  }

  // Derive a filename from the URL
  const filename = parsedUrl.hostname + parsedUrl.pathname.replace(/\//g, '_').slice(0, 80) || 'url-content';

  const db = createClient(supabaseUrl, serviceKey);

  const { data: record, error: dbError } = await db
    .from('project_files')
    .insert({
      user_id: user.id,
      project_id: projectId,
      session_key: sessionKey || null,
      filename: filename,
      file_type: 'text/html',
      file_size: Buffer.byteLength(extractedText, 'utf-8'),
      storage_path: null,
      extracted_text: extractedText.slice(0, 100000), // Limit to 100k chars
      source_type: 'url',
      source_url: url,
    })
    .select('id, filename, file_type, file_size, source_url, created_at, extracted_text')
    .single();

  if (dbError) {
    console.error('[add-url] DB insert error:', dbError);
    return res.status(500).json({ error: 'Failed to save URL content' });
  }

  return res.status(200).json({
    id: record.id,
    filename: record.filename,
    file_type: record.file_type,
    file_size: record.file_size,
    source_url: record.source_url,
    extracted_text_preview: (record.extracted_text || '').slice(0, 500),
  });
}
