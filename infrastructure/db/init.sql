-- Minimal Supabase schema for OpenClaw MVP

CREATE TABLE IF NOT EXISTS function_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invocations (
  id TEXT PRIMARY KEY,
  function_name TEXT NOT NULL,
  inputs JSONB,
  outputs JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  location TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  file TEXT,
  content TEXT,
  source_invocation_id TEXT REFERENCES invocations(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Seed the function registry
INSERT INTO function_registry (id, name, description) VALUES
  ('fn-1', 'generatePatchSkeleton', 'Generate a patch skeleton from target URLs'),
  ('fn-2', 'runQA', 'Run QA checks on a generated patch'),
  ('fn-3', 'storeInvocationRecord', 'Persist an invocation record to memory'),
  ('fn-4', 'summarizeMemory', 'Summarize memory entries for a workspace')
ON CONFLICT (id) DO NOTHING;
