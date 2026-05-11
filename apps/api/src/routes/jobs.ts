import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireUser } from "../lib/auth.js";

const IdParamsSchema = z.object({ id: z.string().min(1) });

export async function registerJobRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/jobs/:id", async (request, reply) => {
    const params = IdParamsSchema.parse(request.params);
    const user = await requireUser(request, reply);
    if (!user) return;
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
    const user = await requireUser(request, reply);
    if (!user) return;
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
    const user = await requireUser(request, reply);
    if (!user) return;
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

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let lastEventCreatedAt = new Date(0);
    let lastEventId = "";

    for (const event of job.events) {
      send(event.type, event);
      lastEventCreatedAt = event.createdAt;
      lastEventId = event.id;
    }

    send("snapshot", { status: job.status, progress: job.progress, currentStep: job.currentStep });

    if (["completed", "failed", "canceled"].includes(job.status)) {
      reply.raw.end();
      return;
    }

    const timer = setInterval(async () => {
      try {
        const latest = await prisma.generationJob.findFirst({
          where: { id: params.id, userId: user.id },
          include: {
            events: {
              where: {
                OR: [{ createdAt: { gt: lastEventCreatedAt } }, { createdAt: lastEventCreatedAt, id: { gt: lastEventId } }]
              },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }]
            }
          }
        });

        if (!latest) {
          send("failed", { message: "Job not found" });
          clearInterval(timer);
          reply.raw.end();
          return;
        }

        for (const event of latest.events) {
          send(event.type, event);
          lastEventCreatedAt = event.createdAt;
          lastEventId = event.id;
        }

        send("snapshot", { status: latest.status, progress: latest.progress, currentStep: latest.currentStep });

        if (["completed", "failed", "canceled"].includes(latest.status)) {
          clearInterval(timer);
          reply.raw.end();
        }
      } catch (error) {
        send("failed", { message: error instanceof Error ? error.message : "SSE stream failed" });
        clearInterval(timer);
        reply.raw.end();
      }
    }, 1000);

    request.raw.on("close", () => {
      clearInterval(timer);
    });
  });
}
