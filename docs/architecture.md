# Architecture

shippy-ops-ai is implemented as a pnpm monorepo.

## Apps

- `apps/web`: Vite + React + TypeScript authenticated app. It uses React Router for navigation and TanStack Query for API data.
- `apps/api`: Fastify + TypeScript backend. It owns project CRUD, fast generation, job records, template reads, and SSE snapshots.
- `apps/worker`: BullMQ worker for long-running generation jobs.

## Packages

- `packages/shared`: Zod schemas, public enums, labels, and shared TypeScript types.
- `packages/ui`: shadcn-style React primitives used by the web app.
- `packages/config`: shared config package placeholder for tsconfig/eslint/prettier expansion.

## Persistence

Prisma models live in `prisma/schema.prisma`. The first slice persists users, projects, project services, environment variable names, generation jobs, events, deployment artifacts, templates, usage records, referrals, and admin audit events.

## Generation

The fast generation flow is deterministic. It selects a seeded `DeploymentTemplate`, combines it with project input, validates the resulting deployment plan through Zod, and stores generated artifacts in PostgreSQL.

The full generation flow currently uses a mock repository-aware pipeline through BullMQ. It writes progress events to PostgreSQL and the frontend consumes them through `GET /jobs/:id/stream` as Server-Sent Events. This gives the app the correct async architecture before real AI calls are added.

Repository inspection supports public `github.com` URLs. It only fetches allowlisted raw metadata files such as `package.json`, lockfiles, Dockerfile, Compose files, env examples, README, and selected monorepo package files. It never executes repository code.

Troubleshooting is currently rules-based. `POST /troubleshoot` classifies common deployment log patterns and labels diagnostic commands as `read_only`, `changes_system`, or `destructive`.

Real OpenRouter generation, S3 artifact storage, Stripe billing, and OAuth are planned for later MVP phases.
