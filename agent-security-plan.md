# Agent Security & Multi-Agent Setup — Execution Plan

> **Purpose**: Instructions for Claude Code to build reusable security and multi-agent modules,
> plus timed reminders for human-only actions (contracts, legal, vendor agreements).
>
> **Scope**: Designed as cross-project reusable modules under `shared/security/` and `shared/agents/`.
> Every project that deploys AI agents with access to org data needs these primitives.
>
> **Date created**: 2026-03-22
> **Owner**: Dennis / GBTA

---

## Part A — Claude Code Executable Modules

Claude Code: execute the sections below in order. Each section produces a self-contained
module under `shared/` that can be copied into any Node.js/Next.js project. Use TypeScript
where the project supports it, otherwise plain JS matching the existing codebase style.

---

### A1. Org-Scoped Data Model (Migration)

**Output**: `infrastructure/db/migrations/002-org-multi-agent.sql`

Create a migration that adds multi-tenancy and multi-agent support to the existing schema.
This is the foundation everything else depends on.

```sql
-- Required tables and columns:
--
-- organisations
--   id UUID PK
--   name TEXT NOT NULL
--   slug TEXT UNIQUE NOT NULL
--   settings JSONB DEFAULT '{}'
--   data_retention_days INT DEFAULT 90
--   created_at TIMESTAMPTZ DEFAULT now()
--
-- Add to profiles (existing):
--   org_id UUID REFERENCES organisations(id)
--   role TEXT CHECK (role IN ('owner','admin','manager','employee')) DEFAULT 'employee'
--
-- org_agents
--   id UUID PK
--   org_id UUID REFERENCES organisations(id) ON DELETE CASCADE
--   employee_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
--   agent_role TEXT CHECK (agent_role IN ('assistant','coach')) NOT NULL
--   openclaw_agent_id TEXT
--   system_prompt TEXT NOT NULL
--   tool_permissions JSONB NOT NULL DEFAULT '[]'
--   active BOOLEAN DEFAULT true
--   created_at TIMESTAMPTZ DEFAULT now()
--   UNIQUE(org_id, employee_user_id, agent_role)
--
-- activity_log
--   id UUID PK DEFAULT gen_random_uuid()
--   org_id UUID REFERENCES organisations(id) ON DELETE CASCADE
--   user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
--   activity_type TEXT NOT NULL  -- 'app_usage','calendar','email','crm','manual_checkin'
--   source TEXT                  -- 'browser_ext','ghl','google','manual'
--   summary TEXT
--   metadata JSONB DEFAULT '{}'
--   started_at TIMESTAMPTZ
--   ended_at TIMESTAMPTZ
--   created_at TIMESTAMPTZ DEFAULT now()
--
-- agent_audit_log
--   id UUID PK DEFAULT gen_random_uuid()
--   org_id UUID REFERENCES organisations(id) ON DELETE CASCADE
--   agent_id UUID REFERENCES org_agents(id) ON DELETE SET NULL
--   user_id UUID REFERENCES profiles(id)
--   action TEXT NOT NULL          -- 'data_read','data_write','llm_call','tool_invoke','recommendation'
--   resource TEXT                 -- what was accessed (table name, API endpoint, file path)
--   detail JSONB DEFAULT '{}'     -- request/response summary (NOT full payloads for PII reasons)
--   llm_provider TEXT             -- 'anthropic','openai','openrouter','self_hosted'
--   tokens_sent INT
--   tokens_received INT
--   created_at TIMESTAMPTZ DEFAULT now()
--
-- consent_records
--   id UUID PK DEFAULT gen_random_uuid()
--   org_id UUID REFERENCES organisations(id) ON DELETE CASCADE
--   user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
--   consent_type TEXT NOT NULL    -- 'activity_tracking','email_access','crm_access','coaching'
--   granted BOOLEAN NOT NULL
--   granted_at TIMESTAMPTZ
--   revoked_at TIMESTAMPTZ
--   ip_address TEXT
--   user_agent TEXT
--   created_at TIMESTAMPTZ DEFAULT now()
--
-- RLS POLICIES (critical):
--   All tables: org_id = get_user_org_id(auth.uid())
--   activity_log: employees see only own rows; managers see team; admins see org
--   agent_audit_log: admins and owners only
--   consent_records: user sees own; admins see org
--
-- INDEXES:
--   activity_log(org_id, user_id, created_at DESC)
--   agent_audit_log(org_id, created_at DESC)
--   agent_audit_log(agent_id, created_at DESC)
--   consent_records(org_id, user_id, consent_type)
--
-- FUNCTION:
--   get_user_org_id(uid UUID) RETURNS UUID
--     SELECT org_id FROM profiles WHERE id = uid
```

**RLS detail**: Write full `CREATE POLICY` statements, not just comments. Every table
must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and at minimum an org-isolation
policy. The `activity_log` table needs tiered access:
- `employee_own_activity`: user_id = auth.uid()
- `manager_team_activity`: user has role 'manager' or above AND target user is in same org
- `admin_full_activity`: user has role 'admin' or 'owner'

---

### A2. Reusable Security Module — `shared/security/`

**Output**: A new `shared/security/` directory usable across any project.

#### A2a. Tool Permission Enforcer

**File**: `shared/security/tool-permissions.js`

```
Purpose: Server-side enforcement of what tools/data each agent can access.
         Prompt-level restrictions are not security — this is the real gate.

Exports:
  - createPermissionEnforcer(permissions: ToolPermissions): Enforcer
  - Enforcer.canAccess(resource: string, action: 'read'|'write'): boolean
  - Enforcer.filterAllowed(resources: string[]): string[]
  - Enforcer.audit(agentId, resource, action, allowed): void  // logs to agent_audit_log

Types (JSDoc or TS):
  ToolPermissions = {
    can_read: string[]     // table names, API endpoints, data categories
    can_write: string[]
    cannot_access: string[]  // explicit deny list (overrides allow)
    max_context_tokens?: number  // limit how much data agent can pull per request
  }

Default permission sets (exported constants):
  ASSISTANT_DEFAULT = {
    can_read: ['activity_log','crm_contacts','email_summaries','task_registry','calendar_events'],
    can_write: ['task_suggestions','chat_messages','agent_memory'],
    cannot_access: ['financial_data','hr_records','salary_data','auth_tokens','raw_credentials']
  }
  COACH_DEFAULT = {
    can_read: ['activity_log','delegation_history','role_descriptions','coaching_notes','task_registry'],
    can_write: ['coaching_notes','chat_messages','agent_memory','delegation_suggestions'],
    cannot_access: ['raw_emails','crm_deals','financial_data','hr_records','salary_data','auth_tokens']
  }
```

Enforcement must happen at the API/function layer — before data reaches the LLM.
If `cannot_access` contains an item, it overrides any `can_read`/`can_write` entry.

#### A2b. Data Classification & Redaction

**File**: `shared/security/data-classifier.js`

```
Purpose: Classify data before it reaches an LLM. Redact or block sensitive content.

Exports:
  - classifyContent(text: string): Classification[]
  - redactPII(text: string): { redacted: string, redactions: Redaction[] }
  - shouldBlockForLLM(classifications: Classification[]): boolean

Classification categories:
  - PII (names, emails, phones, addresses, TFNs, ABNs)
  - FINANCIAL (bank accounts, credit cards, salary figures, invoices)
  - CREDENTIAL (API keys, passwords, tokens, secrets)
  - PRIVILEGED (legal advice, without-prejudice comms, medical)
  - COMMERCIAL (pricing, deal terms, competitor analysis)
  - GENERAL (everything else — safe to send)

Rules:
  - CREDENTIAL: always block, never send to LLM
  - PII: redact by default, configurable per org to allow
  - FINANCIAL: redact numbers, keep category context
  - PRIVILEGED: block unless explicit consent flag
  - COMMERCIAL: allow but log access in audit

Use regex + keyword patterns. Keep patterns in a separate config file
so they can be extended per-project without modifying core logic.

Pattern config file: shared/security/classification-patterns.json
```

#### A2c. Audit Logger

**File**: `shared/security/audit-logger.js`

```
Purpose: Centralised audit logging for all agent actions.
         Writes to agent_audit_log table. Usable from any project.

Exports:
  - createAuditLogger(supabaseClient, orgId): AuditLogger
  - AuditLogger.logAccess(agentId, userId, resource, action, detail?)
  - AuditLogger.logLLMCall(agentId, userId, provider, tokensSent, tokensReceived, purpose)
  - AuditLogger.logToolInvoke(agentId, userId, toolName, inputs, outputs, allowed)
  - AuditLogger.logRecommendation(agentId, userId, recommendationType, content)
  - AuditLogger.query(filters: AuditFilters): AuditEntry[]

Constructor takes a Supabase client (service role) so it works with any Supabase project.
All methods are fire-and-forget (non-blocking) — audit logging must never slow down the agent.
```

#### A2d. Consent Manager

**File**: `shared/security/consent-manager.js`

```
Purpose: Check and manage employee consent for agent data access.
         Required by AU Workplace Surveillance Act 2005 (NSW) and equivalents.

Exports:
  - createConsentManager(supabaseClient): ConsentManager
  - ConsentManager.hasConsent(userId, consentType): Promise<boolean>
  - ConsentManager.grantConsent(userId, consentType, metadata): Promise<void>
  - ConsentManager.revokeConsent(userId, consentType): Promise<void>
  - ConsentManager.getConsentStatus(userId): Promise<ConsentStatus[]>
  - ConsentManager.requireConsent(userId, consentTypes[]): Promise<void>  // throws if missing

Consent types: 'activity_tracking', 'email_access', 'crm_access', 'coaching', 'task_delegation'

Every agent action that accesses employee data MUST check consent first.
If consent is revoked mid-session, the agent must stop accessing that data type immediately.
```

#### A2e. Credential Vault Adapter

**File**: `shared/security/credential-vault.js`

```
Purpose: Abstract credential storage so agent code never touches raw secrets.
         Supports Supabase Vault, env vars, or AWS Secrets Manager.

Exports:
  - createVault(provider: 'supabase'|'env'|'aws', config): Vault
  - Vault.getSecret(key: string): Promise<string>
  - Vault.setSecret(key: string, value: string): Promise<void>
  - Vault.rotateSecret(key: string, newValue: string): Promise<void>
  - Vault.listKeys(): Promise<string[]>  // returns key names only, never values

For 'supabase' provider: uses Supabase Vault (pgsodium)
For 'env' provider: reads from process.env (dev/local only)
For 'aws' provider: uses AWS Secrets Manager SDK

NEVER log secret values. NEVER include secrets in LLM context.
```

---

### A3. Reusable Agent Module — `shared/agents/`

**Output**: A new `shared/agents/` directory with agent provisioning and management.

#### A3a. Agent Provisioner

**File**: `shared/agents/provisioner.js`

```
Purpose: Create and manage Coach + Assistant agents per employee.

Exports:
  - createAgentProvisioner(supabaseClient, vpsAdminUrl, vpsAdminToken): Provisioner
  - Provisioner.provisionPair(orgId, employeeUserId): { assistant: Agent, coach: Agent }
  - Provisioner.deprovision(orgId, employeeUserId): void
  - Provisioner.getAgents(orgId, employeeUserId): { assistant?: Agent, coach?: Agent }
  - Provisioner.updateSystemPrompt(agentId, newPrompt): void
  - Provisioner.updatePermissions(agentId, permissions: ToolPermissions): void

On provisionPair():
  1. Create two rows in org_agents table
  2. Call VPS admin API to create two OpenClaw agents
  3. Set system prompts from templates (see A3b)
  4. Set default tool permissions (ASSISTANT_DEFAULT / COACH_DEFAULT)
  5. Return agent objects with IDs

Agent ID format: '{orgSlug}-{employeeId}-assistant' / '{orgSlug}-{employeeId}-coach'
```

#### A3b. System Prompt Templates

**File**: `shared/agents/prompt-templates.js`

```
Purpose: Versioned system prompt templates for assistant and coach agents.

Exports:
  - ASSISTANT_SYSTEM_PROMPT(employeeName, orgName, roleDescription): string
  - COACH_SYSTEM_PROMPT(employeeName, orgName, roleDescription): string
  - PROMPT_VERSION: string  // semver, track changes

ASSISTANT prompt must include:
  - "You are an AI assistant assigned to [employeeName] at [orgName]."
  - "Your goal is to learn their tasks and workflows so you can eventually take over
     routine, lower-value work — freeing them for higher-value activities."
  - "Observe their activity data. Ask clarifying questions about HOW they do tasks."
  - "Ask WHY they do tasks a certain way — understand the business logic."
  - "Suggest specific tasks you could take over. Start with the most repetitive ones."
  - "Never access data types the employee has not consented to."
  - "Never share information about this employee with other employees' agents."
  - "If you are unsure whether you have permission to access something, ask first."

COACH prompt must include:
  - "You are an AI coach assigned to [employeeName] at [orgName]."
  - "Your role is to help them optimise their work by reviewing what they do and why."
  - "Use a coaching style — ask questions, don't dictate. Help them think critically."
  - "Review their tasks and ask: Does this add value to their role? To the company?"
  - "Suggest delegation opportunities — to human subordinates or to their AI assistant."
  - "Help them identify their highest-value activities and protect time for those."
  - "Track delegation patterns over time. Celebrate progress."
  - "Never access data types the employee has not consented to."
  - "Never make the employee feel surveilled — frame everything as supportive coaching."
```

#### A3c. Agent Gateway Wrapper

**File**: `shared/agents/gateway.js`

```
Purpose: Wrap the OpenClaw gateway client with security checks.
         Every agent interaction passes through here.

Exports:
  - createSecureGateway(openclawClient, permissionEnforcer, auditLogger, consentManager): SecureGateway
  - SecureGateway.sendMessage(agentId, userId, message): AsyncIterator<chunk>
  - SecureGateway.invokeFunction(agentId, userId, functionName, inputs): Promise<result>
  - SecureGateway.readMemory(agentId, userId): Promise<MemoryEntry[]>

On every call:
  1. Check consent (consentManager.requireConsent)
  2. Check permissions (permissionEnforcer.canAccess)
  3. Classify outgoing data (dataClassifier.classifyContent)
  4. Redact if needed (dataClassifier.redactPII)
  5. Forward to OpenClaw gateway
  6. Log the interaction (auditLogger)

This is the SINGLE entry point for all agent operations.
No code should call the OpenClaw gateway directly — always through this wrapper.
```

---

### A4. Data Retention Cron Job

**File**: `shared/security/data-retention.js`

```
Purpose: Auto-purge expired data per org retention settings.
         Run as a cron job (Inngest, Vercel Cron, or node-cron).

Exports:
  - createRetentionJob(supabaseClient): RetentionJob
  - RetentionJob.run(): Promise<{ deleted: { table: string, count: number }[] }>

Tables to purge (where created_at < now() - org.data_retention_days):
  - activity_log
  - agent_audit_log (keep summary aggregates, delete detail)
  - chat_messages (agent conversations, not human-to-human)

Log all deletions to agent_audit_log with action='data_retention_purge'.
Never delete consent_records (legal requirement to retain).
```

---

### A5. API Routes for Admin & Employee UI

**Output**: New API routes in `apps/frontend/pages/api/`

```
Routes to create:

POST /api/org/agents/provision
  - Admin only. Provisions assistant+coach pair for an employee.
  - Body: { employeeUserId }
  - Calls Provisioner.provisionPair()

DELETE /api/org/agents/deprovision
  - Admin only. Removes agent pair.
  - Body: { employeeUserId }

GET /api/org/agents
  - Admin/manager. Lists all agents in org with status.

GET /api/org/audit
  - Admin only. Queries agent_audit_log with filters.
  - Query: ?agentId=&userId=&action=&from=&to=&limit=

GET /api/employee/consent
  - Employee. Returns their consent status for all types.

POST /api/employee/consent
  - Employee. Grant or revoke consent.
  - Body: { consentType, granted: boolean }

GET /api/employee/my-agents
  - Employee. Returns their assistant+coach agent details.

POST /api/employee/pause-tracking
  - Employee. Temporarily pauses activity tracking.
  - Body: { pauseUntil: ISO date }
```

---

### A6. Network Security Hardening

**Output**: Updated `infrastructure/vps/setup.sh`

```
Add to the VPS setup script:

1. Enable TLS on WebSocket gateway (port 18789)
   - Use Let's Encrypt certbot for the VPS domain
   - Update gateway config to use wss:// instead of ws://
   - Update OPENCLAW_GATEWAY_URL in .env to wss://

2. Firewall rules (ufw):
   - Allow 22 (SSH) from admin IPs only
   - Allow 443 (HTTPS) from anywhere (for wss://)
   - Allow 18790 (admin API) ONLY from Vercel IP ranges
   - Deny all other inbound

3. Move hardcoded Ed25519 keys from openclaw-client.js to env vars
   - OPENCLAW_DEVICE_ID
   - OPENCLAW_PUBLIC_KEY
   - OPENCLAW_PRIVATE_KEY

4. Add key rotation script: infrastructure/vps/rotate-keys.sh
```

---

## Part B — Human Action Items with Timed Reminders

These items CANNOT be executed by Claude Code. They require human action —
contracts, legal review, vendor negotiations, and policy decisions.

Copy the reminder blocks below into your calendar, task manager, or set them
as scheduled messages. Dates are relative to project start (2026-03-22).

---

### WEEK 1 (by 2026-03-29) — Immediate / Blocking

#### B1. LLM Provider Data Processing Agreements

```
REMINDER: 2026-03-23 (Monday) 9:00 AM AEST
SUBJECT: Contact Anthropic + OpenAI for enterprise DPA / zero-retention agreements
PRIORITY: CRITICAL — blocks all client deployments

ACTION:
  1. Email Anthropic sales (sales@anthropic.com) requesting:
     - Enterprise API agreement with zero data retention
     - Data Processing Addendum (DPA) for Australian data
     - Confirmation that API inputs are NOT used for training
  2. Email OpenAI sales requesting the same
  3. Email OpenRouter support to understand their data handling
     (they proxy to multiple providers — need clarity on retention at each hop)

WHY: Without these agreements, sending employee activity data / emails / CRM
data through LLM APIs is a data breach waiting to happen. Clients will ask
for proof of these agreements before signing.

FOLLOW-UP REMINDER: 2026-03-26 (Thursday) — chase if no response
DEADLINE: Must have at least one signed DPA before first client onboarding
```

#### B2. Legal Review — Workplace Surveillance Compliance

```
REMINDER: 2026-03-24 (Tuesday) 9:00 AM AEST
SUBJECT: Engage employment lawyer for AI agent surveillance compliance review
PRIORITY: CRITICAL — legal liability

ACTION:
  1. Brief an employment/privacy lawyer (AU jurisdiction) on the system:
     - AI agents that track employee activity (apps, time, tasks)
     - AI agents that read employee emails and CRM activity
     - AI agents that "coach" employees on work optimisation
  2. Get advice on:
     - NSW Workplace Surveillance Act 2005 — notice requirements
     - Other state equivalents (VIC, QLD, WA have different rules)
     - Australian Privacy Act 1988 — APP 3 (collection), APP 6 (use/disclosure)
     - Whether "coaching" framing changes the legal classification
     - Required employee consent language
     - Required employer policy documents
  3. Get template consent forms and workplace policy documents

WHY: "AI agent that follows employees around" is legally surveillance.
Must have proper notice, consent, and policy frameworks before any deployment.
Non-compliance = significant fines + client liability.

BUDGET: Expect $3,000–$8,000 for initial legal opinion + template documents.
DEADLINE: Legal opinion needed before first client pilot
```

#### B3. Draft Client-Facing Security Documentation

```
REMINDER: 2026-03-25 (Wednesday) 2:00 PM AEST
SUBJECT: Write client-facing security & privacy whitepaper
PRIORITY: HIGH — needed for sales conversations

ACTION:
  Create a professional document covering:
  1. Data architecture diagram (where data lives, what crosses boundaries)
  2. Data residency statement (Supabase Sydney, LLM provider locations)
  3. Encryption at rest and in transit details
  4. Access control model (org isolation, role-based, consent-gated)
  5. LLM data handling (zero retention, DPA status)
  6. Audit trail capabilities
  7. Employee rights (consent, revocation, data deletion)
  8. Data retention policies (configurable per org)
  9. Incident response plan outline
  10. Compliance status (Privacy Act, Workplace Surveillance Act)

FORMAT: PDF, branded, suitable for enterprise procurement review.

NOTE: Claude Code can draft the content once the legal review (B2) and
DPA status (B1) are confirmed. Flag this for Claude Code at that point.
```

---

### WEEK 2 (by 2026-04-05) — High Priority

#### B4. Supabase Vault Configuration

```
REMINDER: 2026-03-31 (Monday) 10:00 AM AEST
SUBJECT: Enable Supabase Vault (pgsodium) for credential encryption
PRIORITY: HIGH

ACTION:
  1. Log into Supabase dashboard for the gbta-openclaw project
  2. Enable Vault extension (Database → Extensions → pgsodium)
  3. Create vault entries for:
     - GHL_API_KEY (per org — will need multiple)
     - OPENROUTER_API_KEY
     - OPENCLAW_GATEWAY_TOKEN
     - Ed25519 signing keys
  4. Test retrieval from vault in a server action
  5. Notify Claude Code that vault is ready — it will update the
     credential-vault.js adapter to use the 'supabase' provider

WHY: API keys currently in .env files. For multi-tenant with client
credentials, these MUST be encrypted at rest with per-org isolation.
```

#### B5. VPS TLS Certificate

```
REMINDER: 2026-04-01 (Tuesday) 10:00 AM AEST
SUBJECT: Set up domain + TLS for OpenClaw VPS
PRIORITY: HIGH

ACTION:
  1. Point a subdomain to the VPS IP (e.g., agent.gbta-openclaw.com)
  2. SSH into VPS, run certbot for Let's Encrypt certificate
  3. Update OpenClaw gateway to use the cert (wss:// instead of ws://)
  4. Update Vercel env vars: OPENCLAW_GATEWAY_URL=wss://agent.gbta-openclaw.com
  5. Test WebSocket connection from Vercel → VPS over TLS

WHY: Currently ws:// (unencrypted). All agent traffic including employee
data passes over this connection. Must be encrypted.
```

#### B6. Insurance — Cyber Liability

```
REMINDER: 2026-04-02 (Wednesday) 9:00 AM AEST
SUBJECT: Get cyber liability insurance quote
PRIORITY: MEDIUM-HIGH

ACTION:
  1. Contact insurance broker for cyber liability / professional indemnity
  2. Disclose: AI agents processing employee data, CRM data, email content
  3. Get coverage for: data breach, unauthorized access, client claims
  4. Budget: $2,000–$5,000/year for startup-stage coverage

WHY: Handling sensitive employee data for clients = liability exposure.
Insurance is both protection and a sales asset ("we carry cyber liability cover").
```

---

### WEEK 3 (by 2026-04-12) — Before First Client Pilot

#### B7. Employee Consent Flow — Content Review

```
REMINDER: 2026-04-07 (Monday) 10:00 AM AEST
SUBJECT: Review and approve employee consent flow content
PRIORITY: HIGH — blocks pilot deployment

ACTION:
  1. Review the consent UI that Claude Code will have built (Part A)
  2. Cross-reference consent language with legal advice from B2
  3. Ensure consent form covers all data types:
     - Activity tracking (apps, time, tasks)
     - Email access (read summaries or full content)
     - CRM data access
     - Coaching interactions
     - Task delegation to AI
  4. Ensure revocation is clear and immediate
  5. Approve for first client pilot

NOTE: The technical consent system (consent_records table, ConsentManager)
will be built by Claude Code. This reminder is to review the WORDS shown
to employees and ensure they're legally sound.
```

#### B8. Pen Test / Security Audit

```
REMINDER: 2026-04-08 (Tuesday) 9:00 AM AEST
SUBJECT: Schedule penetration test before first client deployment
PRIORITY: HIGH

ACTION:
  1. Engage a pen testing firm (AU-based preferred)
  2. Scope: web app, API endpoints, VPS, WebSocket gateway, Supabase
  3. Focus areas:
     - Org isolation (can Org A's agent see Org B's data?)
     - Employee isolation (can Employee A see Employee B's activity?)
     - API auth bypass
     - WebSocket hijacking
     - Prompt injection via CRM/email data
     - Credential exposure
  4. Budget: $5,000–$15,000 depending on scope
  5. Fix all critical/high findings before pilot

WHY: Multi-tenant system holding employee surveillance data.
A breach here is front-page news. Test before deploying.
```

---

### WEEK 4+ (by 2026-04-19) — Ongoing

#### B9. Client Onboarding Checklist

```
REMINDER: 2026-04-14 (Monday) 10:00 AM AEST
SUBJECT: Create standardised client onboarding security checklist
PRIORITY: MEDIUM

ACTION:
  For each new client, before go-live:
  [ ] Signed service agreement with data processing terms
  [ ] Client's IT team reviewed security whitepaper (B3)
  [ ] Org created in system with correct data retention settings
  [ ] Client admin account provisioned
  [ ] GHL/CRM API keys stored in Vault (not .env)
  [ ] Employee consent forms distributed and signed
  [ ] All employees have granted consent in the system
  [ ] Test: verify org isolation (agent can't see other orgs)
  [ ] Test: verify employee data separation within org
  [ ] Client IT approved firewall/network config
  [ ] Pen test findings (B8) all resolved
  [ ] LLM DPA (B1) shared with client as evidence
```

#### B10. Quarterly Security Review

```
RECURRING REMINDER: First Monday of each quarter, 10:00 AM AEST
SUBJECT: Quarterly security review — agent data access audit
PRIORITY: MEDIUM

ACTION:
  1. Review agent_audit_log for anomalies across all orgs
  2. Check LLM provider DPA status (renewals, policy changes)
  3. Review and rotate API keys / credentials
  4. Check data retention jobs are running correctly
  5. Review any new LLM providers added to the model registry
  6. Update security whitepaper if architecture changed
  7. Review consent revocation logs — any patterns?
  8. Update classification patterns (shared/security/classification-patterns.json)
```

---

## Part C — Execution Sequence for Claude Code

When instructed to execute this plan, follow this order:

```
Phase 1 — Data Layer (no dependencies) ✅ COMPLETE
  [x] Read this file
  [x] Execute A1: Create migration 002-org-multi-agent.sql
  [x] Execute A2e: Credential vault adapter (needed by everything)

Phase 2 — Security Modules (depends on Phase 1 schema) ✅ COMPLETE
  [x] Execute A2a: Tool permission enforcer
  [x] Execute A2b: Data classifier & redactor
  [x] Execute A2c: Audit logger
  [x] Execute A2d: Consent manager
  [x] Execute A4: Data retention job
  [x] Execute: Security module index (shared/security/index.js)

Phase 3 — Agent Modules (depends on Phase 2) ✅ COMPLETE
  [x] Execute A3a: Agent provisioner
  [x] Execute A3b: System prompt templates
  [x] Execute A3c: Secure gateway wrapper
  [x] Execute: Agent module index (shared/agents/index.js)

Phase 4 — Integration (depends on Phase 3) ✅ COMPLETE
  [x] Execute A5: API routes (org/agents, org/audit, employee/consent, employee/my-agents)
  [x] Execute A6: VPS hardening script (infrastructure/vps/harden.sh)

Phase 5 — Wiring (depends on Phase 4) ✅ COMPLETE
  [x] Update apps/frontend/pages/api/chat.js to route through SecureGateway
  [x] Update lib/openclaw-client.js to use env vars instead of hardcoded keys
  [x] Add admin UI pages: /org/agents, /org/audit, /employee/consent
  [x] Wire GHL integration into OpenClaw function registry (shared/integrations/ghl.js + API route)
```

Each module should:
- Have no project-specific imports (use dependency injection)
- Export a factory function that accepts its dependencies (Supabase client, config, etc.)
- Include JSDoc comments on all exports
- Be copy-pasteable into any Node.js/Next.js project
- Follow existing code style in this repo (plain JS, not TS)

---

## Part D — Responding to Client Security Questions

Use this as a reference when clients ask about security. Update as items are completed.

| Question | Answer | Status |
|----------|--------|--------|
| Where is our data stored? | Supabase PostgreSQL, Sydney (ap-southeast-2). Encrypted at rest (AES-256). | READY |
| Does the AI provider see our data? | LLM calls go through [provider]. We have a signed DPA with zero data retention. Your data is never used for training. | PENDING B1 |
| Can other clients see our data? | No. Row-level security enforces org isolation at the database level. Verified by penetration testing. | PENDING A1, B8 |
| Can employees opt out? | Yes. Employees must explicitly consent to each data type. They can revoke consent at any time, which immediately stops agent access. | PENDING A2d, B2 |
| Is employee monitoring legal? | We comply with the NSW Workplace Surveillance Act 2005 and Australian Privacy Act 1988. Legal review confirmed our approach. | PENDING B2 |
| What audit trail exists? | Every agent action is logged: what data was accessed, when, why, and what was sent to the LLM. Org admins have full audit dashboard access. | PENDING A2c |
| What happens if an employee leaves? | Their agent pair is deprovisioned, activity data is purged per your retention policy, and consent records are archived (legal requirement). | PENDING A3a |
| Can the AI be manipulated by malicious email/CRM data? | We classify and sanitise all external data before it reaches the LLM. Known prompt injection patterns are filtered. | PENDING A2b |
| Do you have insurance? | Yes, we carry cyber liability and professional indemnity insurance. | PENDING B6 |
| Can we do our own security assessment? | Absolutely. We welcome client security reviews and can provide architecture docs, audit logs, and pen test reports. | PENDING B3, B8 |
