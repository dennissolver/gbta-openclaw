# Changelog

## [1.0.0] - 2026-03-19

### Added
- EasyOpenClaw wrapper around OpenClaw autonomous AI agent
- Web-based onboarding (5 steps: auth, risk, AI tier, channels, skills)
- Agent provisioning with per-user isolation
- Project workspaces with custom instructions and sessions
- Discovery Coach with text and voice modes (ElevenLabs)
- Achievement tracking and session tips
- Pricing page (Free, Pro, Business tiers)
- Memory viewer for agent persistent memory
- 6 project templates (Email, DevOps, Content, Research, Business, Daily)
- 17 preset instruction templates
- Full feature directory (26 capabilities)
- Security hardening (RLS, rate limiting, auth, input validation)
- References & Acknowledgments page with dependency licenses

### Infrastructure
- Next.js 16 on Vercel
- Supabase Auth + PostgreSQL (Sydney)
- OpenClaw gateway on DigitalOcean VPS (Sydney)
- ElevenLabs Conversational AI voice agent
- OpenRouter for AI model routing
