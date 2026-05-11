import type { DeploymentPlan } from "@shippy-ops-ai/shared";
import { DeploymentPlanSchema, deploymentTargetLabels, frameworkLabels, serviceLabels } from "@shippy-ops-ai/shared";
import type { DeploymentTemplate, EnvironmentVariable, Project, ProjectService } from "@prisma/client";
import { prisma } from "../db.js";
import type { FullGenerationQueueData } from "../lib/queue.js";
import { inspectRepositoryIfAvailable } from "../lib/repository-inspector.js";

type ProjectWithRelations = Project & {
  services: ProjectService[];
  environmentVariables: EnvironmentVariable[];
};

const steps = [
  ["fetching_repository", "Inspecting repository metadata without executing project code.", 10],
  ["analyzing_project_structure", "Checking known project files, lockfiles, Docker files, and config names.", 22],
  ["detecting_framework", "Detecting framework, runtime, package manager, and service assumptions.", 34],
  ["checking_environment_requirements", "Building environment variable and service requirements.", 48],
  ["generating_dockerfile", "Generating production Dockerfile recommendations.", 62],
  ["generating_compose_file", "Generating compose and platform setup notes.", 74],
  ["generating_troubleshooting_guide", "Generating troubleshooting and security guidance.", 88],
  ["exporting_report", "Saving generated artifacts and report.", 96]
] as const;

export async function processFullGenerationJob(data: FullGenerationQueueData) {
  const job = await prisma.generationJob.findUnique({
    where: { id: data.generationJobId }
  });

  if (!job) {
    throw new Error(`Generation job not found: ${data.generationJobId}`);
  }

  await markRunning(data.generationJobId, "starting_full_generation", "Full deployment package generation started.", 5);

  for (const [type, message, progress] of steps) {
    await delay(900);
    await addProgress(data.generationJobId, type, message, progress);
  }

  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    include: { services: true, environmentVariables: true }
  });

  if (!project) {
    throw new Error(`Project not found: ${data.projectId}`);
  }

  const template = await selectTemplate(project);
  if (!template) {
    throw new Error("No deployment template is available. Run pnpm db:seed first.");
  }

  const inspection = await inspectRepositoryIfAvailable(project.repositoryUrl);
  const plan = DeploymentPlanSchema.parse(buildMockRepositoryAwarePlan(project, template, inspection));
  const markdown = planToMarkdown(project, plan);

  await prisma.$transaction(async (tx) => {
    await tx.deploymentArtifact.createMany({
      data: [
        {
          jobId: data.generationJobId,
          projectId: project.id,
          type: "plan_json",
            filename: "deployment-plan.json",
            contentText: JSON.stringify(plan, null, 2)
        },
        ...plan.files.map((file) => ({
          jobId: data.generationJobId,
          projectId: project.id,
          type: artifactTypeForFile(file.filename),
          filename: file.filename,
          contentText: file.content
        })),
        {
          jobId: data.generationJobId,
          projectId: project.id,
          type: "markdown_report",
          filename: "deployment-report.md",
          contentText: markdown
        },
        {
          jobId: data.generationJobId,
          projectId: project.id,
          type: "checklist",
          filename: "deployment-checklist.md",
          contentText: plan.checklist.map((item) => `- [ ] ${item.title}: ${item.description}`).join("\n")
        }
      ]
    });

    await tx.generationEvent.create({
      data: {
        jobId: data.generationJobId,
        type: "completed",
        message: "Full deployment package completed.",
        metadataJson: { templateSlug: template.slug, mode: "mock_repository_aware", inspection }
      }
    });

    await tx.project.update({
      where: { id: project.id },
      data: { status: "completed" }
    });

    await tx.generationJob.update({
      where: { id: data.generationJobId },
      data: {
        status: "completed",
        currentStep: "completed",
        progress: 100,
        completedAt: new Date()
      }
    });
  });
}

async function markRunning(jobId: string, currentStep: string, message: string, progress: number) {
  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "running",
        currentStep,
        progress,
        startedAt: new Date()
      }
    }),
    prisma.generationEvent.create({
      data: { jobId, type: currentStep, message }
    })
  ]);
}

async function addProgress(jobId: string, currentStep: string, message: string, progress: number) {
  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: jobId },
      data: { currentStep, progress }
    }),
    prisma.generationEvent.create({
      data: { jobId, type: currentStep, message }
    })
  ]);
}

async function selectTemplate(project: ProjectWithRelations) {
  return (
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
    }))
  );
}

function buildMockRepositoryAwarePlan(project: ProjectWithRelations, template: DeploymentTemplate, inspection: Awaited<ReturnType<typeof inspectRepositoryIfAvailable>>): DeploymentPlan {
  const serviceSummary = project.services.map((service) => serviceLabels[service.type]).join(", ") || "No managed services";
  const envKeys = Array.from(new Set([...project.environmentVariables.map((envVar) => envVar.key), ...(inspection?.detectedEnvVars ?? [])]));
  const postgres = project.services.find((service) => service.type === "postgres");
  const redis = project.services.find((service) => service.type === "redis");
  const minio = project.services.find((service) => service.type === "minio");
  const detectedFramework = inspection?.detectedFramework ? frameworkLabels[inspection.detectedFramework] : frameworkLabels[project.framework];
  const detectedPackageManager = inspection?.detectedPackageManager ?? project.packageManager;
  const detectedServices = inspection?.detectedServices?.length ? inspection.detectedServices.map((service) => serviceLabels[service]).join(", ") : serviceSummary;

  return {
    summary: `Repository-aware package for ${project.name}: ${detectedFramework} deployed to ${deploymentTargetLabels[project.deploymentTarget]} at ${project.domain}. Services: ${detectedServices}. ${inspection ? `Inspected files: ${inspection.filesFound.join(", ") || "none"}.` : "No repository URL was provided."}`,
    detectedStack: {
      framework: detectedFramework,
      runtime: project.runtimeVersion ?? runtimeForFramework(project.framework),
      packageManager: detectedPackageManager,
      database: postgres ? serviceLabels[postgres.type] : undefined,
      cache: redis ? serviceLabels[redis.type] : undefined,
      storage: minio ? serviceLabels[minio.type] : undefined
    },
    checklist: [
      {
        title: "Review generated artifacts",
        description: inspection ? `Repository inspection read ${inspection.filesFound.length} allowlisted files without executing code.` : "No repository URL was provided, so generation used project inputs and templates.",
        severity: "warning"
      },
      {
        title: "Confirm service topology",
        description: serviceSummary === "No managed services" ? "No additional services were selected." : `Provision ${serviceSummary} before deploying the app.`,
        severity: "warning"
      },
      {
        title: "Configure environment variables",
        description: envKeys.length > 0 ? `Set ${envKeys.join(", ")} in the deployment target.` : "Add production environment variable names before deployment.",
        severity: envKeys.length > 0 ? "warning" : "critical"
      },
      {
        title: "Validate startup health",
        description: "Deploy once to a staging domain, inspect logs, and confirm the app binds to the expected port.",
        severity: "info"
      }
    ],
    files: [
      { filename: "Dockerfile", language: "dockerfile", content: template.dockerfileTemplate },
      { filename: "docker-compose.yml", language: "yaml", content: template.composeTemplate },
      { filename: ".env.example", language: "dotenv", content: mergeEnvTemplate(template.envTemplate, envKeys) }
    ],
    coolifySteps: [
      "Create the application resource and attach the repository.",
      "Use the generated Dockerfile unless the project already has a verified production Dockerfile.",
      `Set ${project.domain} as the public domain and wait for DNS before enabling HTTPS.`,
      "Attach selected service resources and copy internal connection strings into environment variables.",
      "Deploy and inspect build, runtime, and proxy logs before production traffic."
    ],
    dokploySteps: [
      "Create the Dokploy project and service.",
      "Choose Dockerfile or Compose mode from generated artifacts.",
      "Set environment variable names from .env.example in the Dokploy UI.",
      `Bind ${project.domain} and enable HTTPS after DNS resolves.`,
      "Check runtime logs and container restart count after deployment."
    ],
    dnsSteps: [
      `Create an A record for ${project.domain} pointing to the VPS IP.`,
      "Use separate subdomains for web, API, and marketing surfaces when applicable.",
      "Enable HTTPS only after DNS propagation succeeds.",
      "Avoid exposing database, Redis, or object storage ports publicly."
    ],
    securityNotes: [
      "Do not paste real secrets into shippy-ops-ai; store only variable names here.",
      "Keep destructive migration commands out of automated startup commands.",
      "Use read-only diagnostic commands first when troubleshooting failed deployments.",
      "Rotate any credentials that were committed to a repository before deployment."
    ],
    troubleshooting: [
      {
        symptom: "Build fails in dependency install",
        likelyCause: "The detected package manager and lockfile do not match.",
        fix: `Commit the correct lockfile and use ${project.packageManager} consistently.`
      },
      {
        symptom: "Application returns 502",
        likelyCause: "The app is not listening on the expected container port.",
        fix: "Check app logs, exposed port, and platform port mapping."
      },
      {
        symptom: "Database connection fails",
        likelyCause: "The connection string points to localhost from inside a container.",
        fix: "Use the internal service hostname provided by Docker Compose, Coolify, or Dokploy."
      }
    ]
  };
}

function planToMarkdown(project: ProjectWithRelations, plan: DeploymentPlan) {
  const checklist = plan.checklist.map((item) => `- **${item.title}** (${item.severity}): ${item.description}`).join("\n");
  const files = plan.files.map((file) => `### ${file.filename}\n\n\`\`\`${file.language}\n${file.content}\n\`\`\``).join("\n\n");

  return `# Full Deployment Package: ${project.name}

${plan.summary}

## Checklist

${checklist}

## DNS and HTTPS

${plan.dnsSteps.map((step) => `- ${step}`).join("\n")}

## Security Notes

${plan.securityNotes.map((step) => `- ${step}`).join("\n")}

## Troubleshooting

${plan.troubleshooting.map((item) => `- **${item.symptom}**: ${item.likelyCause} Fix: ${item.fix}`).join("\n")}

## Generated Files

${files}
`;
}

function artifactTypeForFile(filename: string) {
  if (filename === "Dockerfile") return "dockerfile" as const;
  if (filename === "docker-compose.yml") return "compose" as const;
  if (filename === ".env.example") return "env_example" as const;
  return "markdown_report" as const;
}

function runtimeForFramework(framework: Project["framework"]) {
  if (framework === "go_api") return "Go 1.23";
  if (framework === "laravel") return "PHP 8.3";
  if (framework === "static_site") return "Static build";
  return "Node.js 22";
}

function mergeEnvTemplate(template: string, envKeys: string[]) {
  const existingKeys = new Set(
    template
      .split("\n")
      .map((line) => line.split("=")[0]?.trim())
      .filter(Boolean)
  );
  const appended = envKeys.filter((key) => !existingKeys.has(key)).map((key) => `${key}=`);
  return [template.trim(), ...appended].filter(Boolean).join("\n");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
