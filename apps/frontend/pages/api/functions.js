// Next.js API route — list available functions

const FUNCTIONS = [
  { name: 'generatePatchSkeleton', description: 'Generate a patch skeleton from target URLs' },
  { name: 'runQA', description: 'Run QA checks on a generated patch' },
  { name: 'storeInvocationRecord', description: 'Persist an invocation record to memory' },
  { name: 'summarizeMemory', description: 'Summarize memory entries for a workspace' },
];

export default function handler(req, res) {
  res.json({ functions: FUNCTIONS });
}
