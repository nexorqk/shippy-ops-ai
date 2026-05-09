# Deployment

The first implementation can run locally with Docker Compose infrastructure and two Node processes.

## Coolify Direction

Use separate resources:

- `web`: Vite build served as a static site or through a small Node/Nginx container.
- `api`: Fastify service exposing port `4000`.
- `postgres`: managed Coolify PostgreSQL service.
- `redis`: managed Coolify Redis service, required once BullMQ is enabled.
- `minio`: optional S3-compatible storage for generated PDF/ZIP artifacts in later phases.

## Initial Production Notes

1. Set `DATABASE_URL` to the Coolify PostgreSQL internal connection string.
2. Set `APP_URL`, `API_URL`, and CORS origins to production domains.
3. Run `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed` during deployment setup.
4. Keep OpenRouter, Stripe, OAuth, and S3 secrets server-side only.
5. Do not expose PostgreSQL, Redis, or MinIO management ports publicly.
