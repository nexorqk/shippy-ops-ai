# Architecture

DeployPilot AI is implemented as a pnpm monorepo.

## Apps

- `apps/web`: Vite + React + TypeScript authenticated app. It uses React Router for navigation and TanStack Query for API data.
- `apps/api`: Fastify + TypeScript backend. It owns project CRUD, fast generation, job records, template reads, and SSE snapshots.

## Packages

- `packages/shared`: Zod schemas, public enums, labels, and shared TypeScript types.
- `packages/ui`: shadcn-style React primitives used by the web app.
- `packages/config`: shared config package placeholder for tsconfig/eslint/prettier expansion.

## Persistence

Prisma models live in `prisma/schema.prisma`. The first slice persists users, projects, project services, environment variable names, generation jobs, events, deployment artifacts, templates, usage records, referrals, and admin audit events.

## Generation

The fast generation flow is deterministic. It selects a seeded `DeploymentTemplate`, combines it with project input, validates the resulting deployment plan through Zod, and stores generated artifacts in PostgreSQL.

Full AI generation, BullMQ workers, S3 artifact storage, Stripe billing, and OAuth are planned for later MVP phases.
