import type { DeploymentPlan, RepositoryInspection } from "@shippy-ops-ai/shared";
import { DeploymentPlanJsonSchema, DeploymentPlanSchema, deploymentTargetLabels, frameworkLabels, serviceLabels } from "@shippy-ops-ai/shared";
import type { DeploymentTemplate, EnvironmentVariable, Project, ProjectService } from "@prisma/client";

type ProjectWithRelations = Project & {
  services: ProjectService[];
  environmentVariables: EnvironmentVariable[];
};

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | object;
    };
  }>;
};

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL_STRONG);
}

export async function generateDeploymentPlanWithOpenRouter(input: {
  project: ProjectWithRelations;
  template: DeploymentTemplate;
  inspection: RepositoryInspection | null;
}): Promise<DeploymentPlan> {
  const model = process.env.OPENROUTER_MODEL_STRONG;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || !model) {
    throw new Error("OpenRouter strong model is not configured.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "shippy-ops-ai"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a senior DevOps deployment copilot. Return only valid JSON matching the provided schema. Do not include markdown outside JSON. Never suggest executing untrusted repository code. Never ask users to paste real secrets."
        },
        {
          role: "user",
          content: buildDeploymentPrompt(input.project, input.template, input.inspection)
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "deployment_plan",
          strict: true,
          schema: DeploymentPlanJsonSchema
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter deployment generation failed: ${response.status} ${text.slice(0, 500)}`);
  }

  const payload = (await response.json()) as OpenRouterChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  return DeploymentPlanSchema.parse(parsed);
}

function buildDeploymentPrompt(project: ProjectWithRelations, template: DeploymentTemplate, inspection: RepositoryInspection | null) {
  return JSON.stringify(
    {
      task: "Generate a production-minded VPS deployment package.",
      productRules: [
        "Target Coolify, Dokploy, or Docker Compose depending on project.deploymentTarget.",
        "Generated files must include Dockerfile, docker-compose.yml, and .env.example.",
        "Do not include real secret values.",
        "Diagnostic and troubleshooting advice must start with read-only checks.",
        "Repository was inspected only through metadata files; do not assume code execution."
      ],
      project: {
        name: project.name,
        repositoryUrl: project.repositoryUrl,
        framework: frameworkLabels[project.framework],
        packageManager: project.packageManager,
        deploymentTarget: deploymentTargetLabels[project.deploymentTarget],
        domain: project.domain,
        runtimeVersion: project.runtimeVersion,
        services: project.services.map((service) => ({ type: service.type, label: serviceLabels[service.type], name: service.name, required: service.required })),
        environmentVariables: project.environmentVariables.map((envVar) => ({ key: envVar.key, required: envVar.required, isSecret: envVar.isSecret }))
      },
      repositoryInspection: inspection,
      fallbackTemplate: {
        slug: template.slug,
        title: template.title,
        dockerfileTemplate: template.dockerfileTemplate,
        composeTemplate: template.composeTemplate,
        envTemplate: template.envTemplate,
        contentMarkdown: template.contentMarkdown
      }
    },
    null,
    2
  );
}
