# AI Deployment Copilot for VPS/Coolify — Codex Project Specification

## Role for Codex

You are building a production-oriented SaaS called **DeployPilot AI**: an AI deployment copilot for developers who want to deploy web apps to a VPS with Coolify or Dokploy.

The project should be implemented as a real portfolio-grade SaaS, not as a static demo. Prioritize clean architecture, typed code, realistic product flows, readable UI, and deployability.

The target user is a frontend/full-stack developer who has a GitHub repo and a VPS, but is unsure how to correctly prepare Dockerfiles, environment variables, databases, domains, HTTPS, reverse proxy settings, logs, and deployment troubleshooting.

---

## What We Are Building

**DeployPilot AI** is a SaaS that helps developers deploy applications to a VPS using Coolify, Dokploy, Docker Compose, PostgreSQL, Redis, MinIO/S3, and custom domains.

A user provides:

- GitHub repository URL or uploaded project archive
- Framework type: Next.js, React SPA, Node.js API, NestJS, Express, Laravel, Go API, static site
- Package manager: npm, pnpm, yarn, bun
- Deployment target: Coolify, Dokploy, manual Docker Compose
- Domain/subdomain
- Required services: PostgreSQL, Redis, MinIO/S3, RabbitMQ
- Environment variables
- Preferred runtime: Node.js, Go, PHP, static build
- Current error logs, if troubleshooting an existing deployment

The service generates:

- Deployment checklist
- Dockerfile
- docker-compose.yml
- Coolify/Dokploy setup guide
- Environment variable template
- Domain and DNS instructions
- HTTPS/reverse proxy notes
- Database/Redis/MinIO setup notes
- Troubleshooting report
- Security recommendations
- PDF/Markdown deployment report
- Optional ZIP with generated deployment files

The business idea already exists in fragments across DevOps tools and AI wrappers. The important part for this project is the engineering architecture underneath: AI generation, queue-based jobs, SSE progress, billing, usage limits, admin dashboard, template catalog, and production deployment.

---

## Two Generation Flows

### 1. Fast Flow: Template-Based Deployment Plan, About 5 Seconds

The fast flow does not perform deep repository analysis. It uses a rules engine plus predefined templates.

User inputs:

- Project type
- Framework
- Package manager
- Deployment target
- Domain
- Services required
- Runtime version

Output:

- High-level deployment checklist
- Recommended deployment strategy
- Basic Dockerfile
- Basic docker-compose.yml
- .env.example
- Coolify or Dokploy setup steps
- DNS checklist
- Common failure points

Example:

```txt
Detected scenario:
Next.js app + PostgreSQL + Redis on Coolify

Recommended setup:
- Build command: pnpm build
- Start command: pnpm start
- Expose port: 3000
- Add PostgreSQL service in Coolify
- Add Redis service in Coolify
- Configure NEXTAUTH_URL, DATABASE_URL, REDIS_URL
- Point app.example.com A record to VPS IP
```

Implementation notes:

- Use deterministic templates stored in the codebase or database.
- Do not call AI for every fast-flow request unless the user explicitly asks for AI explanation.
- Keep this flow cheap, instant, and reliable.

---

### 2. Custom AI Flow: Repository-Aware Deployment Package, 3–10 Minutes Through Queue

The custom flow runs through a background job and streams progress to the frontend through Server-Sent Events.

User inputs:

- GitHub repository URL or project archive
- Deployment target
- Domain
- Runtime assumptions
- Optional current logs/errors
- Optional notes about VPS provider and existing services

Worker pipeline:

1. Create generation job.
2. Fetch or inspect repository metadata.
3. Detect framework and runtime.
4. Analyze package.json, lockfiles, Dockerfile, compose files, env examples, framework config, README.
5. Identify required services: PostgreSQL, Redis, S3/MinIO, workers, queues, cron jobs.
6. Generate deployment architecture.
7. Generate Dockerfile.
8. Generate docker-compose.yml or Coolify/Dokploy instructions.
9. Generate .env.example.
10. Generate troubleshooting guide.
11. Generate security checklist.
12. Generate Markdown report.
13. Generate PDF report.
14. Save generated artifacts.
15. Notify frontend that the job is complete.

SSE progress events:

```txt
queued
fetching_repository
analyzing_project_structure
detecting_framework
checking_environment_requirements
generating_dockerfile
generating_compose_file
generating_coolify_steps
generating_troubleshooting_guide
exporting_report
completed
failed
```

Important: do not execute untrusted repository code. This product should inspect files and metadata, but not run arbitrary scripts from user repositories.

---

## Core Product Modules

### 1. Project Intake Wizard

A multi-step form where the user creates a deployment project.

Steps:

1. Project source
   - GitHub URL
   - Manual input
   - Upload archive, optional later

2. App type
   - Next.js
   - React SPA
   - Node.js API
   - NestJS
   - Express
   - Laravel/PHP
   - Go API
   - Static site
   - Unknown / auto-detect

3. Deployment target
   - Coolify
   - Dokploy
   - Docker Compose

4. Services
   - PostgreSQL
   - Redis
   - MinIO/S3
   - RabbitMQ
   - Background worker
   - Cron job

5. Domain
   - Root domain
   - App subdomain
   - API subdomain
   - Marketing subdomain

6. Environment variables
   - Add variable names only by default
   - User can mark variables as required/optional
   - Never require users to paste secrets into the app

7. Generation mode
   - Fast template-based plan
   - Full AI deployment package

---

### 2. Deployment Plan Result Page

Show the generated result with tabs:

- Overview
- Checklist
- Dockerfile
- docker-compose.yml
- Environment variables
- Coolify steps
- Dokploy steps
- DNS/HTTPS
- Troubleshooting
- Security
- Export

Each code block must have a copy button.

Each generated artifact should be saved and versioned.

---

### 3. Template Catalog

A public or semi-public catalog of deployment recipes.

Examples:

- Next.js + PostgreSQL on Coolify
- React SPA + Node API + PostgreSQL on Dokploy
- NestJS + Redis worker on Docker Compose
- Laravel + MySQL on Coolify
- Go API + PostgreSQL + Caddy
- Static Vite app on VPS

Catalog features:

- Search
- Tags
- Rating
- Reviews
- Difficulty level
- Estimated setup time
- Required services
- Deployment target filter

This replaces the “catalog with rating and reviews” requirement from the original project brief.

---

### 4. AI Troubleshooting Mode

User pastes deployment logs or an error.

Examples:

```txt
Application failed to start
Cannot connect to database
Port 3000 is already in use
502 Bad Gateway
Nginx reverse proxy error
DATABASE_URL is undefined
Prisma migration failed
Build failed during pnpm install
```

Output:

- Likely root cause
- Severity
- Explanation in plain language
- Step-by-step diagnostic commands
- Fix suggestions
- Prevention checklist

Important safety rule:

Commands must be classified as:

- safe read-only checks
- potentially destructive commands
- commands requiring backup

Never present destructive commands as casual copy-paste fixes.

---

### 5. Billing and Usage Limits

Use Stripe subscriptions.

Plans:

#### Free

- 3 fast deployment plans per month
- 1 AI troubleshooting report per month
- No full AI deployment package
- Public templates only

#### Pro

- 50 fast deployment plans per month
- 20 AI troubleshooting reports per month
- 10 full AI deployment packages per month
- PDF export
- Artifact ZIP export

#### Team, optional later

- Shared workspace
- More limits
- Team members
- Shared templates

Billing requirements:

- Stripe Checkout
- Stripe Customer Portal
- Webhook handling
- Subscription status sync
- Usage limits
- Failed payment handling
- Canceled subscription handling
- Trial period optional

Do not fake billing in the architecture. Implement a clean abstraction so Stripe can be used in test mode.

---

### 6. Referral System With Fraud Protection

Users can invite other users.

Referral behavior:

- Generate referral code per user
- Track signup source
- Reward only after referred user verifies email/OAuth and creates a real project
- Do not reward self-referrals
- Do not reward duplicate accounts from the same user when obvious

Basic fraud protection:

- Prevent same user ID from using own code
- Store referral IP hash, not raw IP if possible
- Store user-agent hash if needed
- Limit rewards per time window
- Admin can manually revoke suspicious rewards

---

### 7. Admin Dashboard

Admin can view:

- Users
- Projects
- Generation jobs
- Failed jobs
- AI cost estimates
- Stripe subscription state
- Template submissions
- Reviews
- Referral rewards
- Abuse signals

Analytics:

- MRR
- Churn
- Active users
- New signups
- Fast generations count
- AI generations count
- Failed jobs count
- Average job duration
- Most used templates
- Most common deployment errors

---

### 8. SEO Marketing Layer

The SaaS must have a separate SEO-oriented marketing layer.

Recommended structure:

- `www.example.com` — marketing site
- `app.example.com` — authenticated app
- `api.example.com` — backend API

SEO pages:

- `/deploy-nextjs-to-coolify`
- `/deploy-react-to-vps`
- `/deploy-nestjs-with-postgres`
- `/coolify-deployment-checklist`
- `/dokploy-vs-coolify`
- `/docker-compose-generator`
- `/vps-deployment-troubleshooting`

Each SEO page should include:

- Title
- Meta description
- Open Graph tags
- Schema.org structured data
- FAQ section
- CTA to generate deployment plan

---

## Chosen Tech Stack

Use the following stack unless there is a strong reason to change it.

### Frontend

- Vite
- React
- TypeScript
- React Router
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query
- Zustand or Redux Toolkit for local UI state
- Monaco Editor or a lightweight code viewer for generated files
- Recharts for analytics

### Backend

Use Node.js with TypeScript.

Preferred options:

- Fastify for a lean API, or
- NestJS if more structure is useful

For this project, prefer **Fastify + TypeScript** unless a framework already exists in the repository.

Backend responsibilities:

- Auth callbacks/session validation
- Project CRUD
- Generation job creation
- SSE progress stream
- Stripe webhooks
- AI orchestration
- Artifact generation
- Admin APIs
- Referral logic
- Usage limit enforcement

### Database

- PostgreSQL
- Prisma or Drizzle ORM

Prefer Prisma for speed of development and clear schema.

### Queue

- Redis
- BullMQ

Use BullMQ for long-running AI generation jobs.

### File Storage

- S3-compatible storage
- MinIO for local/self-hosted development

Store:

- PDF reports
- Markdown reports
- ZIP artifact bundles
- generated deployment files

### AI

- OpenRouter for text generation
- Use structured JSON outputs where possible
- Use different model tiers for fast explanation versus full deployment generation
- Generate Mermaid diagrams as text, not image files

No image generation is required for the MVP.

### Payments

- Stripe
- Keep Paddle/LemonSqueezy as documented alternatives, not required in MVP

### Auth

- Google OAuth
- Auth.js, Better Auth, or custom OAuth session implementation

Prefer Better Auth or Auth.js if this is a full-stack TypeScript app.

### Infrastructure

- Coolify or Dokploy on VPS
- Docker Compose for local development
- PostgreSQL
- Redis
- MinIO
- Sentry
- Grafana + Loki, optional for advanced phase
- Uptime Kuma, optional for advanced phase

---

## Suggested Monorepo Structure

Use a monorepo from the start. The frontend apps should be Vite + React + TypeScript applications with React Router. Do not collapse the first implementation into a single `src/` app.

```txt
apps/
  web/                 # Vite authenticated app: app.example.com
  marketing/           # Vite SEO marketing site: www.example.com
  api/                 # backend API: api.example.com
packages/
  shared/              # shared types, constants, zod schemas
  ui/                  # optional shared UI components
  config/              # eslint, tsconfig, prettier
infra/
  docker-compose.yml
  minio/
  postgres/
  redis/
docs/
  architecture.md
  deployment.md
  env.md
```

---

## Main Pages

### Marketing Site

- `/`
- `/pricing`
- `/templates`
- `/templates/[slug]`
- `/deploy-nextjs-to-coolify`
- `/deploy-react-to-vps`
- `/vps-deployment-troubleshooting`

### App

- `/dashboard`
- `/projects`
- `/projects/new`
- `/projects/[id]`
- `/projects/[id]/jobs/[jobId]`
- `/troubleshoot`
- `/templates`
- `/templates/[id]`
- `/billing`
- `/settings`
- `/admin`

---

## Data Model

Use this as the starting database model.

### User

Fields:

- id
- email
- name
- image
- role: user | admin
- stripeCustomerId
- subscriptionStatus
- plan
- referralCode
- referredByUserId
- createdAt
- updatedAt

### Project

Fields:

- id
- userId
- name
- repositoryUrl
- framework
- packageManager
- deploymentTarget
- domain
- status
- createdAt
- updatedAt

### ProjectService

Fields:

- id
- projectId
- type: postgres | redis | minio | rabbitmq | worker | cron | other
- name
- required
- notes

### EnvironmentVariable

Fields:

- id
- projectId
- key
- required
- description
- isSecret

Do not store actual secret values unless encrypted storage is explicitly implemented.

### GenerationJob

Fields:

- id
- userId
- projectId
- type: fast_plan | full_ai_package | troubleshooting
- status: queued | running | completed | failed | canceled
- currentStep
- progress
- errorMessage
- startedAt
- completedAt
- createdAt
- updatedAt

### GenerationEvent

Fields:

- id
- jobId
- type
- message
- metadataJson
- createdAt

### DeploymentArtifact

Fields:

- id
- jobId
- projectId
- type: dockerfile | compose | env_example | markdown_report | pdf_report | zip | checklist | troubleshooting
- filename
- contentText
- storageUrl
- createdAt

### DeploymentTemplate

Fields:

- id
- slug
- title
- description
- framework
- deploymentTarget
- difficulty
- estimatedMinutes
- contentMarkdown
- dockerfileTemplate
- composeTemplate
- envTemplate
- isPublished
- createdAt
- updatedAt

### TemplateReview

Fields:

- id
- templateId
- userId
- rating
- body
- status: pending | approved | rejected
- createdAt

### UsageRecord

Fields:

- id
- userId
- type
- quantity
- billingPeriod
- createdAt

### ReferralReward

Fields:

- id
- referrerUserId
- referredUserId
- status: pending | approved | rejected
- reason
- createdAt
- updatedAt

### AdminAuditEvent

Fields:

- id
- actorUserId
- action
- entityType
- entityId
- metadataJson
- createdAt

---

## API Routes

Design stable API endpoints.

### Auth

- `GET /auth/session`
- OAuth handled by chosen auth library

### Projects

- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `DELETE /projects/:id`

### Generation Jobs

- `POST /projects/:id/generate/fast`
- `POST /projects/:id/generate/full`
- `POST /troubleshoot`
- `GET /jobs/:id`
- `GET /jobs/:id/events`
- `GET /jobs/:id/stream` for SSE
- `GET /jobs/:id/artifacts`

### Templates

- `GET /templates`
- `GET /templates/:slug`
- `POST /templates/:id/reviews`

### Billing

- `POST /billing/checkout`
- `POST /billing/portal`
- `POST /webhooks/stripe`

### Admin

- `GET /admin/metrics`
- `GET /admin/users`
- `GET /admin/jobs`
- `GET /admin/templates/reviews`
- `PATCH /admin/templates/reviews/:id`
- `GET /admin/referrals`
- `PATCH /admin/referrals/:id`

---

## AI Output Schemas

Use structured output for AI calls. Validate every AI response with Zod before saving.

### DeploymentPlanSchema

```ts
export const DeploymentPlanSchema = z.object({
  summary: z.string(),
  detectedStack: z.object({
    framework: z.string().optional(),
    runtime: z.string().optional(),
    packageManager: z.string().optional(),
    database: z.string().optional(),
    cache: z.string().optional(),
    storage: z.string().optional(),
  }),
  checklist: z.array(z.object({
    title: z.string(),
    description: z.string(),
    severity: z.enum(['info', 'warning', 'critical']).default('info'),
  })),
  files: z.array(z.object({
    filename: z.string(),
    language: z.string(),
    content: z.string(),
  })),
  coolifySteps: z.array(z.string()),
  dokploySteps: z.array(z.string()),
  dnsSteps: z.array(z.string()),
  securityNotes: z.array(z.string()),
  troubleshooting: z.array(z.object({
    symptom: z.string(),
    likelyCause: z.string(),
    fix: z.string(),
  })),
});
```

### TroubleshootingReportSchema

```ts
export const TroubleshootingReportSchema = z.object({
  likelyRootCause: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  explanation: z.string(),
  diagnosticSteps: z.array(z.object({
    command: z.string(),
    purpose: z.string(),
    risk: z.enum(['read_only', 'changes_system', 'destructive']),
  })),
  fixes: z.array(z.object({
    title: z.string(),
    steps: z.array(z.string()),
    risk: z.enum(['low', 'medium', 'high']),
  })),
  prevention: z.array(z.string()),
});
```

---

## Security Requirements

Implement these from the start:

1. Never expose OpenRouter API keys to the browser.
2. Never expose Stripe secrets to the browser.
3. Validate all inputs with Zod.
4. Rate-limit generation endpoints.
5. Enforce usage limits server-side.
6. Do not execute arbitrary code from user repositories.
7. Do not store raw secrets by default.
8. Redact obvious secrets from logs and AI prompts.
9. Protect admin routes by role.
10. Verify Stripe webhook signatures.
11. Sanitize repository URLs.
12. Prevent SSRF when fetching external URLs.
13. Store generated files with access control.
14. Add audit events for admin actions.

---

## UI Requirements

Use a clean SaaS dashboard style.

Important UI components:

- Sidebar navigation
- Project cards
- Multi-step wizard
- Job progress timeline
- SSE live progress indicator
- Code blocks with copy buttons
- Tabs for generated artifacts
- Usage limit meter
- Pricing table
- Admin analytics cards
- Empty states
- Error states
- Loading skeletons

Do not create a playful or childish style. The product is a developer tool. Use a serious, clean, technical aesthetic.

---

## MVP Scope

Build this first.

### MVP 1: Core App

- Auth UI placeholder or simple local auth if OAuth is not ready
- Project creation wizard
- Fast template-based deployment plan
- Save generated plan
- Result page with checklist, Dockerfile, compose, env example
- Basic template catalog
- Basic dashboard

### MVP 2: AI and Queue

- Redis + BullMQ
- Full AI deployment job
- SSE progress stream
- Artifact persistence
- Markdown export
- Troubleshooting mode

### MVP 3: SaaS Layer

- Google OAuth
- Stripe test mode subscriptions
- Usage limits
- Admin dashboard
- Reviews and ratings
- Referral system

### MVP 4: Production Polish

- PDF export
- ZIP export
- SEO marketing pages
- Sentry
- Uptime checks
- Loki/Grafana docs
- Deployment guide for Coolify

---

## Final Expected Result

By the end, the project should provide:

- Deployed SaaS on a VPS with custom domain and HTTPS
- Google OAuth login
- Developer dashboard
- Project creation wizard
- Fast template-based deployment generator
- Full AI repository-aware deployment generator through queue
- SSE progress updates on frontend
- AI troubleshooting mode for deployment errors
- Generated Dockerfile, docker-compose.yml, .env.example, checklists, reports
- PDF and Markdown exports
- Template catalog with ratings and reviews
- Stripe subscription with webhook handling, usage limits, and edge-case handling
- Referral system with basic fraud protection
- Admin panel with moderation and analytics
- SEO pages with Schema.org and Open Graph metadata
- Monitoring hooks: Sentry, uptime, and optional Loki/Grafana docs

---

## Implementation Instructions for Codex

Follow these rules while implementing:

1. Do not build everything in one pass.
2. Start with a working vertical slice: create project → generate fast plan → show result.
3. Keep every feature typed with TypeScript.
4. Use Zod schemas for form validation and AI response validation.
5. Keep UI components reusable.
6. Add meaningful empty states and error states.
7. Prefer simple, reliable implementation over clever abstractions.
8. Do not hardcode fake data where real persistence is expected.
9. Add seed data for templates.
10. Document environment variables.
11. Add Docker Compose for local development.
12. Add a production deployment guide for Coolify.
13. Make sure the app can run locally with one documented command sequence.

Recommended first commands after creating the repository:

```bash
pnpm install
pnpm dev
```

Local infrastructure should be started with:

```bash
docker compose up -d postgres redis minio
```

---

## Environment Variables

Create `.env.example` with at least:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deploypilot"
REDIS_URL="redis://localhost:6379"

APP_URL="http://localhost:3000"
API_URL="http://localhost:4000"
MARKETING_URL="http://localhost:3001"

OPENROUTER_API_KEY=""
OPENROUTER_MODEL_FAST=""
OPENROUTER_MODEL_STRONG=""

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_ID_PRO=""

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
AUTH_SECRET=""

S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET="deploypilot-artifacts"
S3_REGION="us-east-1"

SENTRY_DSN=""
```

---

## Seed Templates

Create initial templates:

1. Next.js + PostgreSQL on Coolify
2. React SPA + Node API on Dokploy
3. NestJS + Redis + PostgreSQL on Docker Compose
4. Vite static app on VPS
5. Laravel + PostgreSQL on Coolify
6. Go API + PostgreSQL with Docker Compose

Each template should include:

- Description
- Required env vars
- Dockerfile
- docker-compose.yml, if relevant
- Deployment steps
- Troubleshooting notes

---

## Acceptance Criteria

The project is considered successful when:

1. A user can create a project.
2. A user can generate a fast deployment plan.
3. The generated plan is saved in the database.
4. The result page shows readable generated artifacts.
5. A user can run a full AI generation job.
6. The frontend receives SSE progress events.
7. The final job output includes generated files and a report.
8. A user can export the report as Markdown and PDF.
9. Usage limits are enforced server-side.
10. Stripe webhooks update subscription state.
11. Admin can inspect users, jobs, templates, and failed generations.
12. Public SEO pages exist for important deployment keywords.
13. The project can be deployed to a VPS through Coolify using its own documentation.

---

## Non-Goals for First Version

Do not implement these in the first version unless everything above works:

- Real automatic deployment to the user’s VPS
- SSH access to user servers
- Running arbitrary repository code
- Editing GitHub repositories directly
- Pull request automation
- Kubernetes support
- Team workspaces
- Enterprise SSO
- Visual drag-and-drop infrastructure designer

These can be added later.

---

## Product Positioning

Use this positioning in copy and UI:

> DeployPilot AI turns a confusing VPS deployment into a clear, project-specific deployment package: Dockerfile, Compose, env checklist, Coolify/Dokploy steps, DNS notes, and troubleshooting guidance.

Target users:

- Frontend developers deploying full-stack apps
- Junior full-stack developers
- Indie hackers
- Developers moving from Vercel/Railway to VPS
- Developers using Coolify or Dokploy
- Developers debugging failed Docker deployments

Primary value:

- Less deployment confusion
- Faster VPS setup
- Fewer production mistakes
- Clear generated artifacts
- Better troubleshooting

---

## Suggested Landing Page Copy

Headline:

```txt
Deploy your app to a VPS without guessing every Docker, DNS, and environment variable step.
```

Subheadline:

```txt
DeployPilot AI generates a project-specific deployment package for Coolify, Dokploy, or Docker Compose: checklists, Dockerfiles, env templates, troubleshooting guides, and production notes.
```

CTA:

```txt
Generate deployment plan
```

Secondary CTA:

```txt
Browse deployment templates
```

Feature cards:

- AI deployment plans
- Coolify and Dokploy guides
- Dockerfile and Compose generation
- Environment variable checklists
- VPS troubleshooting
- PDF and Markdown reports

---

## Development Priority

Implement in this order:

1. Database schema
2. Seed templates
3. Project wizard
4. Fast generation service
5. Result page
6. Job model
7. Queue worker
8. SSE stream
9. AI generation service
10. Artifact storage
11. Troubleshooting mode
12. Auth
13. Billing
14. Admin
15. SEO marketing pages
16. Monitoring and production deployment docs
