import React, { useState } from 'react';

const FUNCTION_CATEGORIES = [
  {
    name: 'Core Agent',
    functions: [
      {
        name: 'executeCommand',
        desc: 'Execute a shell command on the host machine with safety checks',
        inputs: 'command: string, requireConfirmation: boolean',
        example: 'executeCommand({ command: "git status", requireConfirmation: false })',
      },
      {
        name: 'browseWeb',
        desc: 'Navigate to a URL, interact with page elements, extract data',
        inputs: 'url: string, actions: Action[], extractSelectors: string[]',
        example: 'browseWeb({ url: "https://example.com", actions: [{ type: "click", selector: "#login" }] })',
      },
      {
        name: 'sendMessage',
        desc: 'Send a message through any connected messaging platform',
        inputs: 'platform: string, recipient: string, message: string, attachments: File[]',
        example: 'sendMessage({ platform: "telegram", recipient: "@user", message: "Deploy complete!" })',
      },
      {
        name: 'scheduleTask',
        desc: 'Schedule a recurring or one-time task via cron expression',
        inputs: 'cron: string, taskName: string, action: Action',
        example: 'scheduleTask({ cron: "0 7 * * *", taskName: "daily-briefing", action: {...} })',
      },
    ],
  },
  {
    name: 'Memory & Knowledge',
    functions: [
      {
        name: 'storeMemory',
        desc: 'Store a piece of information in persistent memory',
        inputs: 'key: string, value: any, tags: string[], ttl?: number',
        example: 'storeMemory({ key: "client-acme", value: { name: "ACME Corp" }, tags: ["client"] })',
      },
      {
        name: 'recallMemory',
        desc: 'Search and retrieve stored memories by key, tag, or semantic query',
        inputs: 'query: string, tags?: string[], limit?: number',
        example: 'recallMemory({ query: "ACME Corp contact details", limit: 5 })',
      },
      {
        name: 'indexDocument',
        desc: 'Index a document into the knowledge base for retrieval',
        inputs: 'content: string, source: string, metadata: object',
        example: 'indexDocument({ content: "...", source: "company-handbook.pdf", metadata: { type: "policy" } })',
      },
      {
        name: 'summarizeMemory',
        desc: 'Generate a summary of stored memories for a topic or time period',
        inputs: 'topic?: string, since?: Date, format: "brief" | "detailed"',
        example: 'summarizeMemory({ topic: "project-alpha", format: "brief" })',
      },
    ],
  },
  {
    name: 'Automation & Workflows',
    functions: [
      {
        name: 'generatePatchSkeleton',
        desc: 'Generate a web automation patch skeleton from target URLs',
        inputs: 'urls: string[], targetDir: string, options?: object',
        example: 'generatePatchSkeleton({ urls: ["https://buy.nsw.gov.au/login"], targetDir: "workspace/nsw" })',
      },
      {
        name: 'runQA',
        desc: 'Run quality assurance checks on a generated patch or output',
        inputs: 'patchId: string, checks: string[]',
        example: 'runQA({ patchId: "patch-001", checks: ["structure", "selectors", "accessibility"] })',
      },
      {
        name: 'createWorkflow',
        desc: 'Define a multi-step workflow pipeline with conditions and branching',
        inputs: 'name: string, steps: Step[], triggers: Trigger[]',
        example: 'createWorkflow({ name: "deploy-pipeline", steps: [...], triggers: [{ on: "git-push" }] })',
      },
      {
        name: 'storeInvocationRecord',
        desc: 'Persist an invocation record for audit and replay',
        inputs: 'functionName: string, inputs: object, outputs: object',
        example: 'storeInvocationRecord({ functionName: "executeCommand", inputs: {...}, outputs: {...} })',
      },
    ],
  },
  {
    name: 'Integrations',
    functions: [
      {
        name: 'callMCPServer',
        desc: 'Invoke any MCP-compatible server with structured tool calls',
        inputs: 'server: string, tool: string, arguments: object',
        example: 'callMCPServer({ server: "github", tool: "create_issue", arguments: { title: "Bug" } })',
      },
      {
        name: 'installSkill',
        desc: 'Install a skill from ClawHub into the running agent',
        inputs: 'skillId: string, config?: object',
        example: 'installSkill({ skillId: "email-manager", config: { provider: "gmail" } })',
      },
      {
        name: 'connectPlatform',
        desc: 'Connect a new messaging or integration platform',
        inputs: 'platform: string, credentials: object',
        example: 'connectPlatform({ platform: "slack", credentials: { token: "xoxb-..." } })',
      },
      {
        name: 'webhookTrigger',
        desc: 'Register or handle incoming webhook events',
        inputs: 'url: string, event: string, handler: Action',
        example: 'webhookTrigger({ event: "stripe.payment_succeeded", handler: {...} })',
      },
    ],
  },
];

export default function Functions() {
  const [expanded, setExpanded] = useState({});

  const toggle = (name) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Function Registry</h1>
        <p className="text-dark-300 text-lg max-w-2xl mx-auto">
          Every function available to your OpenClaw agent. These can be invoked directly,
          chained in workflows, or triggered by events.
        </p>
      </div>

      <div className="space-y-8">
        {FUNCTION_CATEGORIES.map(cat => (
          <div key={cat.name}>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              {cat.name}
              <span className="text-dark-500 text-sm font-normal">({cat.functions.length} functions)</span>
            </h2>
            <div className="space-y-3">
              {cat.functions.map(fn => (
                <div key={fn.name} className="card-hover">
                  <button
                    onClick={() => toggle(fn.name)}
                    className="w-full text-left flex items-center justify-between"
                  >
                    <div>
                      <span className="text-brand-400 font-mono font-medium">{fn.name}</span>
                      <span className="text-dark-400 text-sm ml-3">{fn.desc}</span>
                    </div>
                    <span className="text-dark-500 text-lg flex-shrink-0 ml-4">
                      {expanded[fn.name] ? '−' : '+'}
                    </span>
                  </button>
                  {expanded[fn.name] && (
                    <div className="mt-4 pt-4 border-t border-dark-700 space-y-3">
                      <div>
                        <span className="text-dark-500 text-xs uppercase tracking-wider">Inputs</span>
                        <div className="font-mono text-sm text-dark-300 mt-1">{fn.inputs}</div>
                      </div>
                      <div>
                        <span className="text-dark-500 text-xs uppercase tracking-wider">Example</span>
                        <div className="bg-dark-950 border border-dark-700 rounded-lg p-3 font-mono text-sm text-dark-300 mt-1 overflow-x-auto">
                          {fn.example}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
