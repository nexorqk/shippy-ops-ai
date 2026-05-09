import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerTemplateRoutes } from "./routes/templates.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info"
  }
});

await app.register(cors, {
  origin: [process.env.APP_URL ?? "http://localhost:3000", "http://localhost:5173"],
  credentials: true
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

await registerTemplateRoutes(app);
await registerProjectRoutes(app);
await registerJobRoutes(app);

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
