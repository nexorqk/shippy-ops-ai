import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export async function registerTemplateRoutes(app: FastifyInstance) {
  app.get("/templates", async () => {
    const templates = await prisma.deploymentTemplate.findMany({
      where: { isPublished: true },
      orderBy: [{ framework: "asc" }, { title: "asc" }]
    });

    return { templates };
  });

  app.get<{ Params: { slug: string } }>("/templates/:slug", async (request, reply) => {
    const template = await prisma.deploymentTemplate.findUnique({
      where: { slug: request.params.slug }
    });

    if (!template || !template.isPublished) {
      return reply.code(404).send({ message: "Template not found" });
    }

    return { template };
  });
}
