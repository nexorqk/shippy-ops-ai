import "dotenv/config";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerRepositoryRoutes } from "./routes/repositories.js";
import { registerTemplateRoutes } from "./routes/templates.js";
import { registerTroubleshootRoutes } from "./routes/troubleshoot.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info"
  }
});

await app.register(cors, {
  origin: [process.env.APP_URL ?? "http://localhost:3000", "http://localhost:5173"],
  credentials: true
});
await app.register(cookie, {
  secret: process.env.AUTH_SECRET || undefined
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if (error instanceof ZodError) {
    return reply.code(400).send({
      message: "Validation failed",
      issues: error.issues
    });
  }

  if (error instanceof Error && error.name === "UsageLimitError") {
    return reply.code(403).send({ message: error.message });
  }

  return reply.code(500).send({ message: "Internal server error" });
});

app.get("/health", async () => ({ status: "ok" }));

await registerAuthRoutes(app);
await registerTemplateRoutes(app);
await registerRepositoryRoutes(app);
await registerProjectRoutes(app);
await registerJobRoutes(app);
await registerTroubleshootRoutes(app);
await registerAdminRoutes(app);

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
