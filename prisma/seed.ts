import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    slug: "nextjs-postgres-coolify",
    title: "Next.js + PostgreSQL on Coolify",
    description: "Production baseline for deploying a Next.js app with a managed PostgreSQL service in Coolify.",
    framework: "nextjs",
    deploymentTarget: "coolify",
    difficulty: "intermediate",
    estimatedMinutes: 35,
    requiredServices: ["postgres"],
    contentMarkdown: [
      "Use Coolify's application resource for the web app and a separate PostgreSQL service.",
      "Set DATABASE_URL from the Coolify PostgreSQL service variables.",
      "Expose port 3000 and configure the app domain before enabling HTTPS."
    ].join("\n"),
    dockerfileTemplate: `FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]`,
    composeTemplate: `services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: \${DATABASE_URL}`,
    envTemplate: `DATABASE_URL=
NEXTAUTH_URL=https://app.example.com
NEXTAUTH_SECRET=`
  },
  {
    slug: "react-node-postgres-dokploy",
    title: "React SPA + Node API on Dokploy",
    description: "Split frontend and API deployment with PostgreSQL using Dokploy services.",
    framework: "react_spa",
    deploymentTarget: "dokploy",
    difficulty: "intermediate",
    estimatedMinutes: 45,
    requiredServices: ["postgres"],
    contentMarkdown: "Deploy the SPA as a static build and the API as a Node service. Keep API_URL public and DATABASE_URL private.",
    dockerfileTemplate: `FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80`,
    composeTemplate: `services:
  web:
    build: ./web
    ports:
      - "8080:80"
  api:
    build: ./api
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: \${DATABASE_URL}`,
    envTemplate: `VITE_API_URL=https://api.example.com
DATABASE_URL=`
  },
  {
    slug: "nestjs-redis-postgres-compose",
    title: "NestJS + Redis + PostgreSQL on Docker Compose",
    description: "Docker Compose recipe for a NestJS API with PostgreSQL and Redis.",
    framework: "nestjs",
    deploymentTarget: "docker_compose",
    difficulty: "advanced",
    estimatedMinutes: 50,
    requiredServices: ["postgres", "redis"],
    contentMarkdown: "Run the API, PostgreSQL, and Redis on one VPS network. Keep migrations as an explicit release step.",
    dockerfileTemplate: `FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/main.js"]`,
    composeTemplate: `services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/app
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
  redis:
    image: redis:7-alpine`,
    envTemplate: `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
REDIS_URL=redis://redis:6379
JWT_SECRET=`
  },
  {
    slug: "vite-static-vps",
    title: "Vite static app on VPS",
    description: "Static Vite deployment with Nginx and DNS/HTTPS notes.",
    framework: "static_site",
    deploymentTarget: "docker_compose",
    difficulty: "beginner",
    estimatedMinutes: 20,
    requiredServices: [],
    contentMarkdown: "Build static assets and serve them through Nginx. Put HTTPS at the reverse proxy layer.",
    dockerfileTemplate: `FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80`,
    composeTemplate: `services:
  web:
    build: .
    ports:
      - "8080:80"`,
    envTemplate: `VITE_API_URL=`
  },
  {
    slug: "laravel-postgres-coolify",
    title: "Laravel + PostgreSQL on Coolify",
    description: "Laravel app with PostgreSQL, storage permissions, queues, and scheduler notes.",
    framework: "laravel",
    deploymentTarget: "coolify",
    difficulty: "advanced",
    estimatedMinutes: 55,
    requiredServices: ["postgres", "worker", "cron"],
    contentMarkdown: "Use a PHP-FPM/Nginx image or Coolify's Docker build. Run migrations intentionally and configure queue workers separately.",
    dockerfileTemplate: `FROM serversideup/php:8.3-fpm-nginx
WORKDIR /var/www/html
COPY --chown=www-data:www-data . .
RUN composer install --no-dev --optimize-autoloader
EXPOSE 8080`,
    composeTemplate: `services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      APP_ENV: production
      DB_CONNECTION: pgsql
      DATABASE_URL: \${DATABASE_URL}`,
    envTemplate: `APP_KEY=
APP_URL=https://app.example.com
DATABASE_URL=`
  },
  {
    slug: "go-api-postgres-compose",
    title: "Go API + PostgreSQL with Docker Compose",
    description: "Small Go API deployment with a multi-stage Dockerfile and PostgreSQL service.",
    framework: "go_api",
    deploymentTarget: "docker_compose",
    difficulty: "intermediate",
    estimatedMinutes: 30,
    requiredServices: ["postgres"],
    contentMarkdown: "Compile a static Go binary, run it in Alpine or distroless, and keep database migrations explicit.",
    dockerfileTemplate: `FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/api ./api
EXPOSE 8080
CMD ["./api"]`,
    composeTemplate: `services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/app?sslmode=disable
    depends_on:
      - postgres
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app`,
    envTemplate: `DATABASE_URL=postgres://postgres:postgres@postgres:5432/app?sslmode=disable
PORT=8080`
  }
] as const;

async function main() {
  await prisma.user.upsert({
    where: { email: "demo@shippy-ops-ai.local" },
    update: {},
    create: {
      email: "demo@shippy-ops-ai.local",
      name: "Demo User",
      referralCode: "DEMOLOCAL"
    }
  });

  for (const template of templates) {
    await prisma.deploymentTemplate.upsert({
      where: { slug: template.slug },
      update: template,
      create: template
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
