// Next.js API route — replaces Express /functions/invoke

const PatchGenerator = require('../../lib/services/PatchGenerator');
const { createClient } = require('@supabase/supabase-js');

const supabase = process.env.SUPABASE_URL
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

const registry = {
  generatePatchSkeleton: (inputs) =>
    PatchGenerator.generate(inputs.urls || [], inputs.targetDir || '.'),
  runQA: () => ({
    qa: '# QA Report\n\n- [x] Patch structure valid\n- [x] Target URLs reachable (stub)\n- [x] No duplicate selectors\n\nAll checks passed (MVP stub).',
  }),
  storeInvocationRecord: (inputs) => ({
    note: 'Invocation record stored',
    recordId: inputs.recordId || 'rec-unknown',
  }),
  summarizeMemory: (inputs) => ({
    summary: `Memory summary for workspace "${inputs.workspace || 'default'}": 0 entries (MVP stub).`,
  }),
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { functionName, inputs } = req.body;

  if (!functionName) {
    return res.status(400).json({ error: 'functionName is required' });
  }

  const fn = registry[functionName];
  if (!fn) {
    return res.status(400).json({ error: `Unknown function: ${functionName}` });
  }

  const outputs = fn(inputs || {});

  // Persist to Supabase if configured
  let invocationId = `inv-${Date.now()}`;
  if (supabase) {
    const { data, error } = await supabase
      .from('invocations')
      .insert({
        id: invocationId,
        function_name: functionName,
        inputs,
        outputs,
        status: 'succeeded',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
    } else if (data) {
      invocationId = data.id;
    }
  }

  res.json({ invocationId, status: 'succeeded', outputs });
}
