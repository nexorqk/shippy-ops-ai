# DeployPilot AI Agent Notes

Use this file first when starting a new agent session. It is intentionally compact to save tokens.

## Product

DeployPilot AI is a SaaS for developers deploying web apps to a VPS with Coolify, Dokploy, or Docker Compose. It generates deployment checklists, Dockerfiles, compose files, env examples, DNS/HTTPS notes, troubleshooting guidance, and reports.

The source specification is `ai-deployment-copilot-codex.md`, but do not load the whole file unless needed. Prefer this file plus `docs/development-log.md` for current context.

## Required Stack

Monorepo from the start.

- Package manager: `pnpm`
- Frontend: Vite + React + TypeScript + React Router + Tailwind CSS + shadcn-style UI
- Backend: Fastify + TypeScript
- Database: PostgreSQL + Prisma
- Queue later: Redis + BullMQ
- Storage later: MinIO/S3
- AI later: OpenRouter with validated Zod outputs
- Billing later: Stripe test mode

## Current Monorepo Layout

- `apps/web`: Vite authenticated app
- `apps/api`: Fastify API
- `packages/shared`: Zod schemas, labels, shared TS types
- `packages/ui`: reusable shadcn-style React primitives
- `packages/config`: shared config placeholder
- `prisma`: schema, migrations, seed data
- `infra`: local Docker Compose services
- `docs`: architecture, env, deployment, development log

## Current MVP Status

Implemented MVP 1 vertical slice:

1. Create project in UI.
2. API persists project, selected services, and env variable names.
3. User generates a fast deterministic deployment plan.
4. API creates a generation job, events, usage record, and artifacts.
5. Result page shows overview, checklist, Dockerfile, compose file, env example, and report.
6. Template catalog is seeded and viewable.

Not implemented yet:

- OAuth/session auth beyond local demo user
- Full AI generation
- BullMQ worker
- Long-running SSE progress stream
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
pnpm build
```

Web: `http://localhost:3000`

API: `http://localhost:4000`

## Important Implementation Rules

- Do not switch frontend to Next.js. The project spec was corrected to Vite + React + React Router.
- Keep the monorepo shape. Do not collapse into a single `src/` app.
- Do not store real secret values. Only store environment variable names unless encrypted storage is explicitly added.
- Fast generation must stay deterministic and template-based. Do not call AI for the fast flow by default.
- Full AI generation should be queued later and must not execute untrusted repository code.
- Validate browser and API inputs with Zod.
- Server-side usage limits must be enforced in API code.
- Prefer small vertical slices over broad unfinished scaffolding.

## Token-Saving Workflow For Future Agents

1. Read `AGENTS.md`.
2. Read `docs/development-log.md`.
3. Only inspect files directly related to the task.
4. Use `rg` for search.
5. Run `pnpm typecheck` and `pnpm build` after code changes.
6. Append meaningful changes to `docs/development-log.md`.
