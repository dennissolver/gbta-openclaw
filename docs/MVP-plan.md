# OpenClaw MVP Plan

## Milestones

### M1: Scaffold (Current)
- [x] Monorepo structure with frontend + backend
- [x] Chat UI with function invocation
- [x] Stub function registry (4 functions)
- [x] Patch generator producing 3 output files
- [x] In-memory invocation store
- [x] Supabase schema (SQL migrations)

### M2: Persistence
- [ ] Wire Supabase client in backend
- [ ] Persist invocations to `invocations` table
- [ ] Persist artifacts to Supabase Storage
- [ ] Load function registry from `function_registry` table

### M3: Auth
- [ ] Supabase Auth integration (frontend + backend middleware)
- [ ] Protected routes in Next.js
- [ ] JWT validation in Express middleware

### M4: Real Automation
- [ ] Replace stub patch generator with real browser automation
- [ ] Live QA checks against target URLs
- [ ] Artifact versioning and diff support

## Acceptance Criteria (MVP)
- Frontend: chat area, project sidebar, function list, patch viewer
- Backend: `/functions/invoke` supports 4 stub functions
- Patch generator: outputs `.patch`, `.patch.notes`, `.patch.qa.md`
- Supabase: schema and migrations ready to run
- CI: GitHub Actions wired
- Docs: architecture, MVP plan, API contracts
