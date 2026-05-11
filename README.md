# shippy-ops-ai

shippy-ops-ai is a production-oriented SaaS prototype for generating VPS deployment packages for Coolify, Dokploy, and Docker Compose.

This repository starts with the first vertical slice:

- Vite + React + TypeScript web app with React Router
- Fastify + TypeScript API
- BullMQ worker foundation for long-running generation jobs
- Google OAuth/session foundation with local demo auth fallback
- Admin MVP for users, jobs, failures, and basic metrics
- Prisma + PostgreSQL persistence
- Seeded deployment template catalog
- Fast template-based generation flow
- Saved project, job, event, and artifact records

## Agent Context

For Codex, opencode, or another model session, start with:

- `AGENTS.md`
- `docs/development-log.md`

These files summarize the project, current implementation status, commands, and next steps without requiring the full specification to be loaded.

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Start local infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis minio
```

3. Create `.env` from `.env.example`, then run database setup:

```bash
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

4. Start the app:

```bash
pnpm dev
```

The web app runs on `http://localhost:3000`; the API runs on `http://localhost:4000`. `pnpm dev` also starts the worker process.

## Current Flow

Open `/projects/new`, enter a project, and generate a fast deployment plan. The API persists:

- project metadata
- selected services
- environment variable names
- generation job
- generation events
- generated Dockerfile, Compose file, env example, checklist, and Markdown report

The project wizard supports two generation modes:

- Fast plan: deterministic template generation completed inside the API request.
- Full package: queued BullMQ job processed by `apps/worker` with live SSE progress events.

## Auth and Admin

Local development uses a demo admin user unless `ALLOW_DEMO_AUTH=false`.

For Google OAuth, set:

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
AUTH_SECRET=""
ADMIN_EMAILS="you@example.com"
```

Google OAuth redirect URI:

```txt
http://localhost:4000/auth/google/callback
```

Admin UI is available at `/admin` for users with role `admin`.
