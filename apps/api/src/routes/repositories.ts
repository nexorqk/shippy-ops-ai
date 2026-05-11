import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { inspectGitHubRepository } from "../lib/repository-inspector.js";

const InspectRepositorySchema = z.object({
  repositoryUrl: z.string().url()
});

export async function registerRepositoryRoutes(app: FastifyInstance) {
  app.post("/repositories/inspect", async (request, reply) => {
    const input = InspectRepositorySchema.parse(request.body);
    try {
      const inspection = await inspectGitHubRepository(input.repositoryUrl);
      return reply.code(200).send({ inspection });
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : "Repository inspection failed" });
    }
  });
}
