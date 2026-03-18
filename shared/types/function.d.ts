export interface FunctionDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface InvocationRecord {
  id: string;
  functionName: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  status: 'pending' | 'succeeded' | 'failed';
  timestamp: string;
}

export interface PatchOutput {
  patch: string;
  notes: string;
  qa: string;
}
