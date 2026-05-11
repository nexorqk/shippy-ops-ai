# Development Log

This log is for Codex, opencode, and any future model session. Keep entries short and practical.

## 2026-05-09

### Specification Update

- Updated `ai-deployment-copilot-codex.md` frontend stack from Next.js App Router to Vite + React + TypeScript + React Router + Tailwind CSS + shadcn/ui.
- Made monorepo mandatory from the first implementation pass.
- Removed the fallback single `src/` structure from the project specification.
- Left `Next.js` references where they describe customer application types or deployment templates.

### Initial Implementation

Created the first MVP vertical slice:

- `pnpm` monorepo root with `apps/*` and `packages/*`.
- `apps/web`: Vite React app with React Router, TanStack Query, React Hook Form, Tailwind CSS, and shadcn-style UI components.
- `apps/api`: Fastify API with Prisma persistence.
- `packages/shared`: Zod schemas, shared enum labels, and TypeScript types.
- `packages/ui`: reusable Button, Card, Input, Textarea, Label, Badge, and CodeBlock primitives.
- `prisma/schema.prisma`: data model for users, projects, services, env variable names, generation jobs, events, artifacts, templates, reviews, usage, referrals, and audit events.
- `prisma/seed.ts`: six seed templates:
  - Next.js + PostgreSQL on Coolify
  - React SPA + Node API on Dokploy
  - NestJS + Redis + PostgreSQL on Docker Compose
  - Vite static app on VPS
  - Laravel + PostgreSQL on Coolify
  - Go API + PostgreSQL with Docker Compose
- `infra/docker-compose.yml`: local PostgreSQL, Redis, and MinIO.
- `docs/architecture.md`, `docs/env.md`, `docs/deployment.md`.
- `README.md` with local setup instructions.

### Implemented Flow

Current working path:

1. Open `/projects/new`.
2. Enter project metadata, stack, target, services, and environment variable names.
3. Web app calls `POST /projects`.
4. Web app calls `POST /projects/:id/generate/fast`.
5. API selects the closest seeded template.
6. API creates a completed `GenerationJob`.
7. API stores generation events, usage record, and artifacts.
8. Result page opens `/projects/:projectId/jobs/:jobId`.
9. User can inspect overview, checklist, Dockerfile, `docker-compose.yml`, `.env.example`, and Markdown report.

### Verification Completed

Commands run successfully:

```bash
pnpm install
pnpm db:generate
pnpm prisma migrate dev --name init
pnpm db:seed
pnpm typecheck
pnpm build
```

HTTP smoke checks completed:

- `GET /health`
- `GET /templates`
- `POST /projects`
- `POST /projects/:id/generate/fast`
- `GET /projects`

Temporary smoke-test projects were removed from the local database after verification.

### Active Local Services

At the end of initial implementation, these were running:

- API dev server: `http://localhost:4000`
- Web dev server: `http://localhost:3000`
- Docker Compose services: PostgreSQL, Redis, MinIO

Future sessions should verify whether these are still running instead of assuming.

### Known Technical Notes

- API uses a local demo user from `ensureDemoUser()` until auth is implemented.
- Free usage limit is currently hardcoded to 3 fast plans per billing period in `apps/api/src/lib/usage.ts`.
- Fast plan generation is deterministic and lives in `apps/api/src/lib/fast-plan.ts`.
- Template selection order is exact match, then framework match, then deployment target match.
- `GET /jobs/:id/stream` currently returns a finite SSE snapshot of persisted events. It is not a long-running BullMQ stream yet.
- Artifacts are stored in PostgreSQL text fields for MVP 1. S3/MinIO artifact storage is a later phase.

### Next Recommended Slice

At the time of this entry, the next planned slice was MVP 2 foundation: BullMQ worker, async full generation route, live SSE progress, repository metadata inspection, and troubleshooting mode.

## 2026-05-10

### Project Rename

- Renamed product/package references from DeployPilot AI to `shippy-ops-ai`.
- Workspace packages now use `@shippy-ops-ai/*`.
- Local infra names now use `shippy-ops-ai-*`; database name is `shippy_ops_ai`.

### MVP 2 Foundation

Added async full generation foundation:

- Added `apps/worker` with BullMQ worker process.
- Added `full-generation` queue backed by Redis.
- Added `POST /projects/:id/generate/full`.
- Added persisted progress events for queued, running, step updates, completed, and failed states.
- Converted `GET /jobs/:id/stream` into a live SSE stream backed by database polling.
- Added UI generation mode selector: Fast plan or Full package.
- Result page now listens to SSE snapshots/events and refreshes artifacts when a job completes.

The full generation implementation is intentionally a mock repository-aware pipeline for now. It simulates the worker stages and persists a generated package, but it does not call OpenRouter or inspect a remote repository yet.

### Verification Completed

Commands run successfully:

```bash
pnpm prisma migrate dev
pnpm db:seed
pnpm typecheck
pnpm build
```

HTTP smoke checks completed:

- `POST /projects`
- `POST /projects/:id/generate/full`
- `GET /jobs/:id`
- `GET /jobs/:id/artifacts`

The smoke full generation job reached `completed` and persisted six artifacts. The temporary smoke-test project was removed from the local database after verification.

Recommended next slice:

1. Add real repository metadata inspection without executing code.
2. Add troubleshooting mode with risk-classified diagnostic commands.
3. Replace mock full generation content with OpenRouter structured JSON output.

## 2026-05-11

### MVP Quality Improvements

Implemented four requested MVP improvements:

- Public GitHub repository inspection:
  - `POST /repositories/inspect`
  - validates `github.com` URLs only
  - fetches allowlisted raw metadata files only
  - detects framework, package manager, services, env vars, and monorepo package files
  - full generation worker now uses repository inspection when `repositoryUrl` exists
- Troubleshooting mode:
  - `POST /troubleshoot`
  - UI route `/troubleshoot`
  - rules-based reports for 502/proxy, database connectivity, and lockfile/package-manager failures
  - diagnostic commands are risk-classified
- Result page improvements:
  - normalized artifact names for fast and full generation: `deployment-plan.json`, `deployment-report.md`, `deployment-checklist.md`
  - added tabs for Coolify, Dokploy, DNS/HTTPS, Security, and Troubleshooting
  - added Markdown report download in the browser
- Tests:
  - added Vitest
  - repository inspector tests
  - troubleshooting classifier tests

Verification completed:

```bash
pnpm typecheck
pnpm test
pnpm build
```

HTTP smoke checks completed:

- `POST /repositories/inspect` against `https://github.com/nexorqk/shippy-ops-ai`
- `POST /troubleshoot`
- `POST /projects`
- `POST /projects/:id/generate/full`
- `GET /jobs/:id`
- `GET /jobs/:id/artifacts`

The full generation smoke job completed with six normalized artifacts and repository-aware summary. Temporary smoke data was removed from the local database.

Next recommended slice:

1. Replace rules/mock generation with OpenRouter structured JSON behind feature flags.
2. Add auth/session and per-user project boundaries beyond the demo user.
3. Add admin list views for failed jobs and troubleshooting reports.
