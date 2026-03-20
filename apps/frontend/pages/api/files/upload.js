/**
 * POST /api/files/upload — Upload a file to a project
 *
 * Accepts multipart form data with:
 * - file: the file to upload
 * - projectId: the project to attach to
 * - sessionKey: optional session key
 *
 * Uploads to Supabase Storage and extracts text where possible.
 */
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: false },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const TEXT_EXTENSIONS = new Set([
  '.txt', '.csv', '.md', '.json', '.html', '.htm', '.xml', '.yaml', '.yml',
  '.log', '.ini', '.cfg', '.conf', '.env', '.sh', '.bat', '.ps1',
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h',
  '.css', '.scss', '.less', '.sql', '.graphql',
]);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico']);
const DOC_EXTENSIONS = new Set(['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods']);

async function getUser(req) {
  if (!supabaseUrl || !serviceKey) return { user: null };
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    // Use service role key for reliable token verification in serverless
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) return { user };
  }

  // Cookie fallback
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

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

async function extractText(filePath, filename, mimeType) {
  const ext = path.extname(filename).toLowerCase();

  // PDF extraction
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (e) {
      console.warn('[upload] PDF parse failed:', e.message);
      return `PDF file: ${filename} (text extraction failed)`;
    }
  }

  // Plain text files
  if (TEXT_EXTENSIONS.has(ext) || mimeType?.startsWith('text/')) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return `Text file: ${filename}`;
    }
  }

  // Images — placeholder for future OCR
  if (IMAGE_EXTENSIONS.has(ext) || mimeType?.startsWith('image/')) {
    return `Image file: ${filename}`;
  }

  // Word/Excel — placeholder for future parsing
  if (DOC_EXTENSIONS.has(ext)) {
    return `Document: ${filename} (${ext.slice(1).toUpperCase()})`;
  }

  return `File: ${filename} (${mimeType || 'unknown type'})`;
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

  let fields, files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (err) {
    console.error('[upload] Form parse error:', err.message);
    return res.status(400).json({ error: 'Failed to parse upload: ' + err.message });
  }

  // formidable v3 wraps values in arrays
  const rawProjectId = Array.isArray(fields.projectId) ? fields.projectId[0] : fields.projectId;
  const sessionKey = Array.isArray(fields.sessionKey) ? fields.sessionKey[0] : fields.sessionKey;

  if (!rawProjectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  // "workspace" is not a valid UUID — store as null for non-project files
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawProjectId);
  const projectId = isUuid ? rawProjectId : null;

  // Get the uploaded file — formidable v3 wraps in array
  const fileField = files.file;
  const file = Array.isArray(fileField) ? fileField[0] : fileField;
  if (!file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const filename = file.originalFilename || file.newFilename || 'unnamed';
  const mimeType = file.mimetype || 'application/octet-stream';
  const fileSize = file.size || 0;

  // Read file buffer
  const fileBuffer = fs.readFileSync(file.filepath);

  // Upload to Supabase Storage
  const storagePath = `${user.id}/${rawProjectId}/${filename}`;
  const db = createClient(supabaseUrl, serviceKey);

  const { error: uploadError } = await db.storage
    .from('project-files')
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[upload] Storage upload error:', uploadError);
    return res.status(500).json({ error: 'Storage upload failed: ' + uploadError.message });
  }

  // Extract text content
  const extractedText = await extractText(file.filepath, filename, mimeType);

  // Save metadata to project_files table
  const { data: record, error: dbError } = await db
    .from('project_files')
    .insert({
      user_id: user.id,
      project_id: projectId,
      session_key: sessionKey || null,
      filename,
      file_type: mimeType,
      file_size: fileSize,
      storage_path: storagePath,
      extracted_text: extractedText || null,
      source_type: 'upload',
    })
    .select('id, filename, file_type, file_size, storage_path, extracted_text, created_at')
    .single();

  if (dbError) {
    console.error('[upload] DB insert error:', dbError);
    // Try to clean up the uploaded file
    await db.storage.from('project-files').remove([storagePath]).catch(() => {});
    return res.status(500).json({ error: 'Failed to save file record: ' + dbError.message });
  }

  // Clean up temp file
  try { fs.unlinkSync(file.filepath); } catch {}

  return res.status(200).json({
    id: record.id,
    filename: record.filename,
    file_type: record.file_type,
    file_size: record.file_size,
    storage_path: record.storage_path,
    extracted_text_preview: (record.extracted_text || '').slice(0, 500),
  });
}
