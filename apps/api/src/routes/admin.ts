import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { requireAdmin } from "../lib/auth.js";

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/admin/metrics", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const [users, projects, jobs, failedJobs, templates, troubleshootingReports, recentJobs] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.generationJob.count(),
      prisma.generationJob.count({ where: { status: "failed" } }),
      prisma.deploymentTemplate.count({ where: { isPublished: true } }),
      prisma.generationJob.count({ where: { type: "troubleshooting" } }),
      prisma.generationJob.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true, name: true } },
          project: { select: { name: true, domain: true } }
        }
      })
    ]);

    return {
      metrics: {
        users,
        projects,
        jobs,
        failedJobs,
        templates,
        troubleshootingReports,
        mrr: 0,
        churn: 0
      },
      recentJobs
    };
  });

  app.get("/admin/users", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const users = await prisma.user.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: { select: { projects: true, jobs: true } }
      }
    });

    return { users };
  });

  app.get("/admin/jobs", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const jobs = await prisma.generationJob.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        project: { select: { name: true, domain: true } },
        artifacts: { select: { id: true, type: true, filename: true } }
      }
    });

    return { jobs };
  });
}
