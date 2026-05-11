# shippy-ops-ai Agent Notes

Use this file first when starting a new agent session. It is intentionally compact to save tokens.

## Product

shippy-ops-ai is a SaaS for developers deploying web apps to a VPS with Coolify, Dokploy, or Docker Compose. It generates deployment checklists, Dockerfiles, compose files, env examples, DNS/HTTPS notes, troubleshooting guidance, and reports.

The source specification is `ai-deployment-copilot-codex.md`, but do not load the whole file unless needed. Prefer this file plus `docs/development-log.md` for current context.

## Required Stack

Monorepo from the start.

- Package manager: `pnpm`
- Frontend: Vite + React + TypeScript + React Router + Tailwind CSS + shadcn-style UI
- Backend: Fastify + TypeScript
- Database: PostgreSQL + Prisma
- Queue: Redis + BullMQ
- Storage later: MinIO/S3
- AI later: OpenRouter with validated Zod outputs
- Billing later: Stripe test mode

## Current Monorepo Layout

- `apps/web`: Vite authenticated app
- `apps/api`: Fastify API
- `apps/worker`: BullMQ worker for queued full generation jobs
- `packages/shared`: Zod schemas, labels, shared TS types
- `packages/ui`: reusable shadcn-style React primitives
- `packages/config`: shared config placeholder
- `prisma`: schema, migrations, seed data
- `infra`: local Docker Compose services
- `docs`: architecture, env, deployment, development log

## Current MVP Status

Implemented MVP 1 vertical slice plus MVP 2 foundation:

1. Create project in UI.
2. API persists project, selected services, and env variable names.
3. User generates a fast deterministic deployment plan.
4. API creates a generation job, events, usage record, and artifacts.
5. Result page shows overview, checklist, Dockerfile, compose file, env example, and report.
6. Template catalog is seeded and viewable.
7. Full package generation can be queued through BullMQ.
8. `apps/worker` processes mock full generation jobs and persists progress events.
9. Result page listens to live SSE snapshots/events.
10. Public GitHub repository inspection reads allowlisted metadata files without executing code.
11. Troubleshooting mode creates risk-classified diagnostic reports.
12. Result page has normalized artifact names, guidance tabs, and Markdown download.

Not implemented yet:

- OAuth/session auth beyond local demo user
- Real AI generation with OpenRouter
- Private repository access
- Stripe billing
- Admin dashboard
- Referral system
- PDF/ZIP export
- Marketing app

## Local Commands

Install:

```bash
pnpm install
```

Start infra:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis minio
```

Create env and DB:

```bash
cp .env.example .env
pnpm db:generate
pnpm prisma migrate dev
pnpm db:seed
```

Run:

```bash
pnpm dev
```

Validate:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Web: `http://localhost:3000`

API: `http://localhost:4000`

## Important Implementation Rules

- Do not switch frontend to Next.js. The project spec was corrected to Vite + React + React Router.
- Keep the monorepo shape. Do not collapse into a single `src/` app.
- Do not store real secret values. Only store environment variable names unless encrypted storage is explicitly added.
- Fast generation must stay deterministic and template-based. Do not call AI for the fast flow by default.
- Real AI generation must stay queued and must not execute untrusted repository code.
- Validate browser and API inputs with Zod.
- Server-side usage limits must be enforced in API code.
- Prefer small vertical slices over broad unfinished scaffolding.

## Token-Saving Workflow For Future Agents

1. Read `AGENTS.md`.
2. Read `docs/development-log.md`.
3. Only inspect files directly related to the task.
4. Use `rg` for search.
5. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` after code changes.
6. Append meaningful changes to `docs/development-log.md`.
