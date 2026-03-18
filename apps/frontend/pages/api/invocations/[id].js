// Next.js API route — get invocation by ID from Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = process.env.SUPABASE_URL
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

export default async function handler(req, res) {
  const { id } = req.query;

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const { data, error } = await supabase
    .from('invocations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Invocation not found' });
  }

  res.json(data);
}
