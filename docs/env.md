# Environment Variables

Use `.env.example` as the local starting point.

## Required for MVP 1

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `REDIS_URL`: Reserved for BullMQ in MVP 2.
- `APP_URL`: Vite web app URL, normally `http://localhost:3000`.
- `API_URL`: Fastify API URL, normally `http://localhost:4000`.

## Reserved for Later Phases

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL_FAST`
- `OPENROUTER_MODEL_STRONG`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PRO`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `SENTRY_DSN`
