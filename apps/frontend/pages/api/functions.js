// Next.js API route — list available functions (authenticated)

import { requireAuth } from '../../lib/api-auth';

const FUNCTIONS = [
  { name: 'generatePatchSkeleton', description: 'Generate a patch skeleton from target URLs' },
  { name: 'runQA', description: 'Run QA checks on a generated patch' },
  { name: 'storeInvocationRecord', description: 'Persist an invocation record to memory' },
  { name: 'summarizeMemory', description: 'Summarize memory entries for a workspace' },
];

export default requireAuth(function handler(req, res) {
  res.json({ functions: FUNCTIONS });
});
