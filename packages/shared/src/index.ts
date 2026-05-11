import { z } from "zod";

export const FrameworkSchema = z.enum([
  "nextjs",
  "react_spa",
  "node_api",
  "nestjs",
  "express",
  "laravel",
  "go_api",
  "static_site",
  "unknown"
]);

export const PackageManagerSchema = z.enum(["npm", "pnpm", "yarn", "bun"]);
export const DeploymentTargetSchema = z.enum(["coolify", "dokploy", "docker_compose"]);
export const ProjectStatusSchema = z.enum(["draft", "ready", "generating", "completed", "failed"]);
export const JobTypeSchema = z.enum(["fast_plan", "full_ai_package", "troubleshooting"]);
export const JobStatusSchema = z.enum(["queued", "running", "completed", "failed", "canceled"]);
export const ServiceTypeSchema = z.enum(["postgres", "redis", "minio", "rabbitmq", "worker", "cron", "other"]);

export const RepositoryInspectionSchema = z.object({
  repositoryUrl: z.string().url(),
  provider: z.literal("github"),
  owner: z.string(),
  repo: z.string(),
  branch: z.string().optional(),
  filesFound: z.array(z.string()),
  detectedFramework: FrameworkSchema.optional(),
  detectedPackageManager: PackageManagerSchema.optional(),
  detectedServices: z.array(ServiceTypeSchema),
  detectedEnvVars: z.array(z.string()),
  notes: z.array(z.string())
});

export const TroubleshootingInputSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().trim().min(2).max(160).default("Deployment troubleshooting"),
  deploymentTarget: DeploymentTargetSchema.optional(),
  logs: z.string().trim().min(10).max(20000),
  context: z.string().trim().max(2000).optional().default("")
});

export const EnvironmentVariableInputSchema = z.object({
  key: z.string().trim().min(1).max(120).regex(/^[A-Z0-9_]+$/, "Use uppercase env var names"),
  required: z.boolean().default(true),
  description: z.string().trim().max(240).optional().default(""),
  isSecret: z.boolean().default(true)
});

export const ProjectServiceInputSchema = z.object({
  type: ServiceTypeSchema,
  name: z.string().trim().min(1).max(80),
  required: z.boolean().default(true),
  notes: z.string().trim().max(240).optional().default("")
});

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  repositoryUrl: z.string().trim().url().optional().or(z.literal("")),
  framework: FrameworkSchema,
  packageManager: PackageManagerSchema,
  deploymentTarget: DeploymentTargetSchema,
  domain: z.string().trim().min(3).max(160),
  runtimeVersion: z.string().trim().max(40).optional().default(""),
  services: z.array(ProjectServiceInputSchema).default([]),
  environmentVariables: z.array(EnvironmentVariableInputSchema).default([])
});

export const DeploymentPlanSchema = z.object({
  summary: z.string(),
  detectedStack: z.object({
    framework: z.string().optional(),
    runtime: z.string().optional(),
    packageManager: z.string().optional(),
    database: z.string().optional(),
    cache: z.string().optional(),
    storage: z.string().optional()
  }),
  checklist: z.array(z.object({
    title: z.string(),
    description: z.string(),
    severity: z.enum(["info", "warning", "critical"]).default("info")
  })),
  files: z.array(z.object({
    filename: z.string(),
    language: z.string(),
    content: z.string()
  })),
  coolifySteps: z.array(z.string()),
  dokploySteps: z.array(z.string()),
  dnsSteps: z.array(z.string()),
  securityNotes: z.array(z.string()),
  troubleshooting: z.array(z.object({
    symptom: z.string(),
    likelyCause: z.string(),
    fix: z.string()
  }))
});

export const DeploymentPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "detectedStack", "checklist", "files", "coolifySteps", "dokploySteps", "dnsSteps", "securityNotes", "troubleshooting"],
  properties: {
    summary: { type: "string" },
    detectedStack: {
      type: "object",
      additionalProperties: false,
      required: ["framework", "runtime", "packageManager", "database", "cache", "storage"],
      properties: {
        framework: { type: "string" },
        runtime: { type: "string" },
        packageManager: { type: "string" },
        database: { type: "string" },
        cache: { type: "string" },
        storage: { type: "string" }
      }
    },
    checklist: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "severity"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "critical"] }
        }
      }
    },
    files: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["filename", "language", "content"],
        properties: {
          filename: { type: "string" },
          language: { type: "string" },
          content: { type: "string" }
        }
      }
    },
    coolifySteps: { type: "array", items: { type: "string" } },
    dokploySteps: { type: "array", items: { type: "string" } },
    dnsSteps: { type: "array", items: { type: "string" } },
    securityNotes: { type: "array", items: { type: "string" } },
    troubleshooting: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["symptom", "likelyCause", "fix"],
        properties: {
          symptom: { type: "string" },
          likelyCause: { type: "string" },
          fix: { type: "string" }
        }
      }
    }
  }
} as const;

export const TroubleshootingReportSchema = z.object({
  likelyRootCause: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  explanation: z.string(),
  diagnosticSteps: z.array(z.object({
    command: z.string(),
    purpose: z.string(),
    risk: z.enum(["read_only", "changes_system", "destructive"])
  })),
  fixes: z.array(z.object({
    title: z.string(),
    steps: z.array(z.string()),
    risk: z.enum(["low", "medium", "high"])
  })),
  prevention: z.array(z.string())
});

export const TroubleshootingReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["likelyRootCause", "confidence", "severity", "explanation", "diagnosticSteps", "fixes", "prevention"],
  properties: {
    likelyRootCause: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    explanation: { type: "string" },
    diagnosticSteps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["command", "purpose", "risk"],
        properties: {
          command: { type: "string" },
          purpose: { type: "string" },
          risk: { type: "string", enum: ["read_only", "changes_system", "destructive"] }
        }
      }
    },
    fixes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "steps", "risk"],
        properties: {
          title: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
          risk: { type: "string", enum: ["low", "medium", "high"] }
        }
      }
    },
    prevention: { type: "array", items: { type: "string" } }
  }
} as const;

export type Framework = z.infer<typeof FrameworkSchema>;
export type PackageManager = z.infer<typeof PackageManagerSchema>;
export type DeploymentTarget = z.infer<typeof DeploymentTargetSchema>;
export type ServiceType = z.infer<typeof ServiceTypeSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type DeploymentPlan = z.infer<typeof DeploymentPlanSchema>;
export type TroubleshootingReport = z.infer<typeof TroubleshootingReportSchema>;
export type RepositoryInspection = z.infer<typeof RepositoryInspectionSchema>;
export type TroubleshootingInput = z.infer<typeof TroubleshootingInputSchema>;

export const frameworkLabels: Record<Framework, string> = {
  nextjs: "Next.js",
  react_spa: "React SPA",
  node_api: "Node.js API",
  nestjs: "NestJS",
  express: "Express",
  laravel: "Laravel / PHP",
  go_api: "Go API",
  static_site: "Static site",
  unknown: "Unknown / auto-detect"
};

export const deploymentTargetLabels: Record<DeploymentTarget, string> = {
  coolify: "Coolify",
  dokploy: "Dokploy",
  docker_compose: "Docker Compose"
};

export const serviceLabels: Record<ServiceType, string> = {
  postgres: "PostgreSQL",
  redis: "Redis",
  minio: "MinIO / S3",
  rabbitmq: "RabbitMQ",
  worker: "Background worker",
  cron: "Cron job",
  other: "Other"
};
