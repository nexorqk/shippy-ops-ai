import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureDemoUser, prisma } from "../db.js";

const IdParamsSchema = z.object({ id: z.string().min(1) });

export async function registerJobRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/jobs/:id", async (request, reply) => {
    const params = IdParamsSchema.parse(request.params);
    const user = await ensureDemoUser();
    const job = await prisma.generationJob.findFirst({
      where: { id: params.id, userId: user.id },
      include: { events: { orderBy: { createdAt: "asc" } }, artifacts: true }
    });

    if (!job) {
      return reply.code(404).send({ message: "Job not found" });
    }

    return { job };
  });

  app.get<{ Params: { id: string } }>("/jobs/:id/artifacts", async (request, reply) => {
    const params = IdParamsSchema.parse(request.params);
    const user = await ensureDemoUser();
    const job = await prisma.generationJob.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true }
    });

    if (!job) {
      return reply.code(404).send({ message: "Job not found" });
    }

    const artifacts = await prisma.deploymentArtifact.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: "asc" }
    });

    return { artifacts };
  });

  app.get<{ Params: { id: string } }>("/jobs/:id/stream", async (request, reply) => {
    const params = IdParamsSchema.parse(request.params);
    const user = await ensureDemoUser();
    const job = await prisma.generationJob.findFirst({
      where: { id: params.id, userId: user.id },
      include: { events: { orderBy: { createdAt: "asc" } } }
    });

    if (!job) {
      return reply.code(404).send({ message: "Job not found" });
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });

    for (const event of job.events) {
      reply.raw.write(`event: ${event.type}\n`);
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    reply.raw.write(`event: snapshot\n`);
    reply.raw.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, currentStep: job.currentStep })}\n\n`);
    reply.raw.end();
  });
}
