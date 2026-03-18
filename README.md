# gbta-openclaw

OpenClaw MVP — Next.js on Vercel + Supabase. No separate backend.

## Architecture

```
Browser → Next.js (Vercel) → API Routes (/api/*) → Supabase (PostgreSQL)
```

## Quick Start

```bash
cd apps/frontend
npm install
npm run dev
```

Open http://localhost:3000

## Deploy

Push to GitHub. Vercel auto-deploys. Set these env vars in Vercel:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_SUPABASE_URL` | Same URL (for client-side auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same key (for client-side auth) |

## API Routes

- `POST /api/invoke` — invoke a registered function
- `GET /api/functions` — list available functions
- `GET /api/invocations/:id` — get invocation record (requires Supabase)
- `GET /api/health` — health check

## Structure

```
apps/frontend/
  pages/           UI pages
  pages/api/       API routes (serverless functions on Vercel)
  components/      React components
  lib/             Supabase client, services
infrastructure/    Database schema and migrations
docs/              Architecture docs
```
