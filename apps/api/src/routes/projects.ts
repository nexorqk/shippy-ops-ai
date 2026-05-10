import { CreateProjectSchema, DeploymentPlanSchema } from "@shippy-ops-ai/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureDemoUser, prisma } from "../db.js";
import { buildFastPlan, planToMarkdown } from "../lib/fast-plan.js";
import { fullGenerationQueue } from "../lib/queue.js";
import { assertFastPlanLimit, currentBillingPeriod } from "../lib/usage.js";

const IdParamsSchema = z.object({ id: z.string().min(1) });

export async function registerProjectRoutes(app: FastifyInstance) {
  app.get("/projects", async () => {
    const user = await ensureDemoUser();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: { services: true, environmentVariables: true, jobs: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" }
    });

    return { projects };
  });

  app.post("/projects", async (request, reply) => {
    const input = CreateProjectSchema.parse(request.body);
    const user = await ensureDemoUser();

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: input.name,
        repositoryUrl: input.repositoryUrl || null,
        framework: input.framework,
        packageManager: input.packageManager,
        deploymentTarget: input.deploymentTarget,
        domain: input.domain,
        runtimeVersion: input.runtimeVersion || null,
        status: "ready",
        services: {
          create: input.services.map((service) => ({
            type: service.type,
            name: service.name,
            required: service.required,
            notes: service.notes
          }))
        },
        environmentVariables: {
          create: input.environmentVariables.map((envVar) => ({
            key: envVar.key,
            required: envVar.required,
            description: envVar.description,
            isSecret: envVar.isSecret
          }))
        }
      },
      include: { services: true, environmentVariables: true }
    });

    return reply.code(201).send({ project });
  });

  app.get<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    const params = IdParamsSchema.parse(request.params);
    const user = await ensureDemoUser();
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        services: true,
        environmentVariables: true,
        jobs: { include: { artifacts: true }, orderBy: { createdAt: "desc" } }
      }
    });

    if (!project) {
      return reply.code(404).send({ message: "Project not found" });
    }

    return { project };
  });

  app.post<{ Params: { id: string } }>("/projects/:id/generate/fast", async (request, reply) => {
    const params = IdParamsSchema.parse(request.params);
    const user = await ensureDemoUser();
    const { billingPeriod } = await assertFastPlanLimit(user.id);

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: user.id },
      include: { services: true, environmentVariables: true }
    });

    if (!project) {
      return reply.code(404).send({ message: "Project not found" });
    }

    const template =
      (await prisma.deploymentTemplate.findFirst({
        where: { isPublished: true, framework: project.framework, deploymentTarget: project.deploymentTarget },
        orderBy: { estimatedMinutes: "asc" }
      })) ??
      (await prisma.deploymentTemplate.findFirst({
        where: { isPublished: true, framework: project.framework },
        orderBy: { estimatedMinutes: "asc" }
      })) ??
      (await prisma.deploymentTemplate.findFirst({
        where: { isPublished: true, deploymentTarget: project.deploymentTarget },
        orderBy: { estimatedMinutes: "asc" }
      }));

    if (!template) {
      return reply.code(409).send({ message: "No deployment template is available. Run pnpm db:seed first." });
    }

    const job = await prisma.generationJob.create({
      data: {
        userId: user.id,
        projectId: project.id,
        type: "fast_plan",
        status: "running",
        currentStep: "generating_template_plan",
        progress: 50,
        startedAt: new Date(),
        events: {
          create: [
            { type: "queued", message: "Fast deployment plan queued." },
            { type: "generating_template_plan", message: "Generating deterministic deployment artifacts from templates." }
          ]
        }
      }
    });

    const plan = DeploymentPlanSchema.parse(buildFastPlan(project, template));
    const markdown = planToMarkdown(project, plan);

    const completedJob = await prisma.$transaction(async (tx) => {
      await tx.deploymentArtifact.createMany({
        data: [
          {
            jobId: job.id,
            projectId: project.id,
            type: "plan_json",
            filename: "deployment-plan.json",
            contentText: JSON.stringify(plan, null, 2)
          },
          ...plan.files.map((file) => ({
            jobId: job.id,
            projectId: project.id,
            type: artifactTypeForFile(file.filename),
            filename: file.filename,
            contentText: file.content
          })),
          {
            jobId: job.id,
            projectId: project.id,
            type: "markdown_report",
            filename: "deployment-report.md",
            contentText: markdown
          },
          {
            jobId: job.id,
            projectId: project.id,
            type: "checklist",
            filename: "deployment-checklist.md",
            contentText: plan.checklist.map((item) => `- [ ] ${item.title}: ${item.description}`).join("\n")
          }
        ]
      });

      await tx.generationEvent.create({
        data: {
          jobId: job.id,
          type: "completed",
          message: "Fast deployment plan completed.",
          metadataJson: { templateSlug: template.slug }
        }
      });

      await tx.usageRecord.create({
        data: {
          userId: user.id,
          type: "fast_plan",
          quantity: 1,
          billingPeriod
        }
      });

      await tx.project.update({
        where: { id: project.id },
        data: { status: "completed" }
      });

      return tx.generationJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          currentStep: "completed",
          progress: 100,
          completedAt: new Date()
        },
        include: { artifacts: true, events: { orderBy: { createdAt: "asc" } } }
      });
    });

    return reply.code(201).send({ job: completedJob, plan });
  });

  app.post<{ Params: { id: string } }>("/projects/:id/generate/full", async (request, reply) => {
    const params = IdParamsSchema.parse(request.params);
    const user = await ensureDemoUser();

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true }
    });

    if (!project) {
      return reply.code(404).send({ message: "Project not found" });
    }

    const job = await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: { status: "generating" }
      });

      return tx.generationJob.create({
        data: {
          userId: user.id,
          projectId: project.id,
          type: "full_ai_package",
          status: "queued",
          currentStep: "queued",
          progress: 0,
          events: {
            create: {
              type: "queued",
              message: "Full deployment package queued."
            }
          }
        },
        include: { events: { orderBy: { createdAt: "asc" } }, artifacts: true }
      });
    });

    await fullGenerationQueue.add(
      "full-generation",
      {
        generationJobId: job.id,
        projectId: project.id,
        userId: user.id
      },
      {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 100
      }
    );

    return reply.code(202).send({ job });
  });
}

function artifactTypeForFile(filename: string) {
  if (filename === "Dockerfile") return "dockerfile" as const;
  if (filename === "docker-compose.yml") return "compose" as const;
  if (filename === ".env.example") return "env_example" as const;
  return "markdown_report" as const;
}
