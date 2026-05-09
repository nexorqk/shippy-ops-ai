import type { DeploymentPlan } from "@deploypilot/shared";
import { deploymentTargetLabels, frameworkLabels, serviceLabels } from "@deploypilot/shared";
import type { DeploymentTemplate, EnvironmentVariable, Project, ProjectService } from "@prisma/client";

type ProjectWithRelations = Project & {
  services: ProjectService[];
  environmentVariables: EnvironmentVariable[];
};

export function buildFastPlan(project: ProjectWithRelations, template: DeploymentTemplate): DeploymentPlan {
  const services = project.services.map((service) => serviceLabels[service.type]).join(", ") || "No managed services";
  const envKeys = project.environmentVariables.map((envVar) => envVar.key);
  const primaryDatabase = project.services.find((service) => service.type === "postgres");
  const cache = project.services.find((service) => service.type === "redis");
  const storage = project.services.find((service) => service.type === "minio");

  const envExample = mergeEnvTemplate(
    template.envTemplate,
    project.environmentVariables.map((envVar) => ({
      key: envVar.key,
      value: envVar.isSecret ? "" : envVar.description ?? ""
    }))
  );

  return {
    summary: `${frameworkLabels[project.framework]} deployment for ${project.domain} using ${deploymentTargetLabels[project.deploymentTarget]}. Required services: ${services}.`,
    detectedStack: {
      framework: frameworkLabels[project.framework],
      runtime: project.runtimeVersion || runtimeForFramework(project.framework),
      packageManager: project.packageManager,
      database: primaryDatabase ? serviceLabels[primaryDatabase.type] : undefined,
      cache: cache ? serviceLabels[cache.type] : undefined,
      storage: storage ? serviceLabels[storage.type] : undefined
    },
    checklist: [
      {
        title: "Confirm build and start commands",
        description: `Use the package manager ${project.packageManager} and verify production build commands before deploying.`,
        severity: "info"
      },
      {
        title: "Create service resources",
        description: services === "No managed services" ? "No extra managed services were selected." : `Provision ${services} before starting the app.`,
        severity: services === "No managed services" ? "info" : "warning"
      },
      {
        title: "Configure environment variable names",
        description: envKeys.length > 0 ? `Set these names in the target platform: ${envKeys.join(", ")}.` : "Add required runtime variables before production deployment.",
        severity: envKeys.length > 0 ? "warning" : "critical"
      },
      {
        title: "Point DNS to the VPS",
        description: `Create an A record for ${project.domain} pointing to the server IP, then enable HTTPS in the deployment target.`,
        severity: "warning"
      }
    ],
    files: [
      {
        filename: "Dockerfile",
        language: "dockerfile",
        content: template.dockerfileTemplate
      },
      {
        filename: "docker-compose.yml",
        language: "yaml",
        content: template.composeTemplate
      },
      {
        filename: ".env.example",
        language: "dotenv",
        content: envExample
      }
    ],
    coolifySteps: [
      "Create a new application resource and connect the GitHub repository.",
      `Set the public domain to ${project.domain}.`,
      "Add selected services and copy generated connection strings into environment variables.",
      "Enable HTTPS after DNS resolves to the VPS IP.",
      "Deploy once, inspect build logs, then verify runtime health."
    ],
    dokploySteps: [
      "Create a project and attach the repository.",
      "Choose Dockerfile or Compose deployment depending on the generated artifact.",
      `Configure ${project.domain} as the application domain.`,
      "Add environment variable names from .env.example without pasting secrets into DeployPilot.",
      "Deploy and review container logs before routing production traffic."
    ],
    dnsSteps: [
      `Create an A record for ${project.domain}.`,
      "Wait for DNS propagation before enabling HTTPS.",
      "Keep API and app subdomains separate when the project has multiple public services.",
      "Use platform-managed TLS unless you operate a custom reverse proxy."
    ],
    securityNotes: [
      "Do not commit real secrets. Store only variable names in source control.",
      "Keep database and Redis ports private to the Docker network or platform service network.",
      "Run migrations as an explicit release step and keep a backup before destructive migrations.",
      "Use least-privilege credentials for S3-compatible storage and external services."
    ],
    troubleshooting: [
      {
        symptom: "502 Bad Gateway",
        likelyCause: "The container is not listening on the expected port or the app crashed during startup.",
        fix: "Verify the exposed port, check container logs, and confirm required environment variables are set."
      },
      {
        symptom: "Database connection refused",
        likelyCause: "DATABASE_URL points to localhost from inside a container or the database service is not ready.",
        fix: "Use the service hostname from the platform or Docker Compose network and confirm credentials."
      },
      {
        symptom: "Build fails during dependency install",
        likelyCause: "Lockfile and package manager mismatch.",
        fix: `Use ${project.packageManager} consistently and commit the correct lockfile.`
      }
    ]
  };
}

export function planToMarkdown(project: ProjectWithRelations, plan: DeploymentPlan) {
  const files = plan.files.map((file) => `### ${file.filename}\n\n\`\`\`${file.language}\n${file.content}\n\`\`\``).join("\n\n");
  const checklist = plan.checklist.map((item) => `- **${item.title}** (${item.severity}): ${item.description}`).join("\n");

  return `# Deployment Plan: ${project.name}

${plan.summary}

## Checklist

${checklist}

## DNS and HTTPS

${plan.dnsSteps.map((step) => `- ${step}`).join("\n")}

## Security Notes

${plan.securityNotes.map((step) => `- ${step}`).join("\n")}

## Generated Files

${files}
`;
}

function runtimeForFramework(framework: Project["framework"]) {
  if (framework === "go_api") return "Go 1.23";
  if (framework === "laravel") return "PHP 8.3";
  if (framework === "static_site") return "Static build";
  return "Node.js 22";
}

function mergeEnvTemplate(template: string, envVars: Array<{ key: string; value: string }>) {
  const existingKeys = new Set(
    template
      .split("\n")
      .map((line) => line.split("=")[0]?.trim())
      .filter(Boolean)
  );
  const appended = envVars
    .filter((envVar) => !existingKeys.has(envVar.key))
    .map((envVar) => `${envVar.key}=${envVar.value}`);

  return [template.trim(), ...appended].filter(Boolean).join("\n");
}
