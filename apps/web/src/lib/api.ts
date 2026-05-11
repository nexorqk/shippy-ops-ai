import type { CreateProjectInput, DeploymentPlan, RepositoryInspection, TroubleshootingInput, TroubleshootingReport } from "@shippy-ops-ai/shared";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type ApiProject = {
  id: string;
  name: string;
  repositoryUrl: string | null;
  framework: CreateProjectInput["framework"];
  packageManager: CreateProjectInput["packageManager"];
  deploymentTarget: CreateProjectInput["deploymentTarget"];
  domain: string;
  runtimeVersion: string | null;
  status: string;
  createdAt: string;
  services: Array<{ id: string; type: string; name: string; required: boolean; notes: string | null }>;
  environmentVariables: Array<{ id: string; key: string; required: boolean; description: string | null; isSecret: boolean }>;
  jobs?: ApiJob[];
};

export type ApiArtifact = {
  id: string;
  type: string;
  filename: string;
  contentText: string | null;
  createdAt: string;
};

export type ApiJob = {
  id: string;
  type: string;
  status: string;
  currentStep: string | null;
  progress: number;
  createdAt: string;
  events?: Array<{ id: string; type: string; message: string; createdAt: string }>;
  artifacts?: ApiArtifact[];
};

export type ApiTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string;
  framework: string;
  deploymentTarget: string;
  difficulty: string;
  estimatedMinutes: number;
  requiredServices: string[];
  contentMarkdown: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(payload.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  listProjects: () => request<{ projects: ApiProject[] }>("/projects"),
  createProject: (input: CreateProjectInput) =>
    request<{ project: ApiProject }>("/projects", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  generateFastPlan: (projectId: string) =>
    request<{ job: ApiJob; plan: DeploymentPlan }>(`/projects/${projectId}/generate/fast`, {
      method: "POST"
    }),
  generateFullPackage: (projectId: string) =>
    request<{ job: ApiJob }>(`/projects/${projectId}/generate/full`, {
      method: "POST"
    }),
  inspectRepository: (repositoryUrl: string) =>
    request<{ inspection: RepositoryInspection }>("/repositories/inspect", {
      method: "POST",
      body: JSON.stringify({ repositoryUrl })
    }),
  troubleshoot: (input: TroubleshootingInput) =>
    request<{ job: ApiJob; report: TroubleshootingReport }>("/troubleshoot", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  getJob: (jobId: string) => request<{ job: ApiJob }>(`/jobs/${jobId}`),
  jobStreamUrl: (jobId: string) => `${API_URL}/jobs/${jobId}/stream`,
  listTemplates: () => request<{ templates: ApiTemplate[] }>("/templates")
};
