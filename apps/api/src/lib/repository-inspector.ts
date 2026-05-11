import type { Framework, PackageManager, RepositoryInspection, ServiceType } from "@shippy-ops-ai/shared";
import { RepositoryInspectionSchema } from "@shippy-ops-ai/shared";

type FetchFn = typeof fetch;

type GitHubRepositoryRef = {
  owner: string;
  repo: string;
  branch?: string;
};

const fileAllowlist = [
  "package.json",
  "apps/web/package.json",
  "apps/api/package.json",
  "apps/worker/package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "Dockerfile",
  "docker-compose.yml",
  "compose.yml",
  ".env.example",
  ".env.sample",
  "README.md",
  "next.config.js",
  "next.config.mjs",
  "vite.config.ts",
  "vite.config.js",
  "nest-cli.json",
  "artisan",
  "go.mod"
] as const;

export function parseGitHubRepositoryUrl(repositoryUrl: string): GitHubRepositoryRef {
  const url = new URL(repositoryUrl);
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("Only public github.com repository URLs are supported for inspection.");
  }

  const [owner, repoWithSuffix, maybeTree, branch] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repoWithSuffix) {
    throw new Error("GitHub repository URL must include owner and repository.");
  }

  const repo = repoWithSuffix.replace(/\.git$/, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error("GitHub owner or repository contains unsupported characters.");
  }

  return {
    owner,
    repo,
    branch: maybeTree === "tree" && branch ? branch : undefined
  };
}

export async function inspectGitHubRepository(repositoryUrl: string, fetchFn: FetchFn = fetch): Promise<RepositoryInspection> {
  const ref = parseGitHubRepositoryUrl(repositoryUrl);
  const branches = ref.branch ? [ref.branch] : ["main", "master"];
  const files = new Map<string, string>();
  const notes: string[] = [];
  let resolvedBranch = ref.branch;

  for (const branch of branches) {
    const branchFiles = await fetchAllowlistedFiles(ref, branch, fetchFn);
    if (branchFiles.size > 0) {
      resolvedBranch = branch;
      for (const [path, content] of branchFiles) files.set(path, content);
      break;
    }
  }

  if (files.size === 0) {
    notes.push("No allowlisted repository files were readable. The repository may be private or use a non-standard default branch.");
  }

  const packageJsons = Array.from(files)
    .filter(([path]) => path.endsWith("package.json"))
    .map(([, content]) => parsePackageJson(content))
    .filter(isPackageJson);
  const packageJson = packageJsons[0] ?? null;
  const detectedFramework = detectFramework(files, packageJsons);
  const detectedPackageManager = detectPackageManager(files);
  const detectedServices = detectServices(files, packageJsons);
  const detectedEnvVars = detectEnvVars(files, packageJsons);

  if (packageJson?.scripts) {
    const scriptNames = Object.keys(packageJson.scripts).join(", ");
    notes.push(`Detected package scripts: ${scriptNames || "none"}.`);
  }

  return RepositoryInspectionSchema.parse({
    repositoryUrl,
    provider: "github",
    owner: ref.owner,
    repo: ref.repo,
    branch: resolvedBranch,
    filesFound: Array.from(files.keys()).sort(),
    detectedFramework,
    detectedPackageManager,
    detectedServices,
    detectedEnvVars,
    notes
  });
}

async function fetchAllowlistedFiles(ref: GitHubRepositoryRef, branch: string, fetchFn: FetchFn) {
  const files = new Map<string, string>();

  await Promise.all(
    fileAllowlist.map(async (path) => {
      const rawUrl = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${branch}/${path}`;
      const response = await fetchFn(rawUrl, { redirect: "error" });
      if (!response.ok) return;
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text") && !contentType.includes("json") && !contentType.includes("application/octet-stream")) return;
      const text = await response.text();
      if (text.length > 200_000) return;
      files.set(path, text);
    })
  );

  return files;
}

function parsePackageJson(content: string | undefined) {
  if (!content) return null;
  try {
    return JSON.parse(content) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

function detectFramework(files: Map<string, string>, packageJsons: Array<NonNullable<ReturnType<typeof parsePackageJson>>>): Framework | undefined {
  const deps = mergePackageDeps(packageJsons);
  if (deps.next || files.has("next.config.js") || files.has("next.config.mjs")) return "nextjs";
  if (deps["@nestjs/core"] || files.has("nest-cli.json")) return "nestjs";
  if (deps.express) return "express";
  if (files.has("artisan")) return "laravel";
  if (files.has("go.mod")) return "go_api";
  if (deps.vite || files.has("vite.config.ts") || files.has("vite.config.js")) return "react_spa";
  return undefined;
}

function detectPackageManager(files: Map<string, string>): PackageManager | undefined {
  if (files.has("pnpm-lock.yaml")) return "pnpm";
  if (files.has("bun.lockb")) return "bun";
  if (files.has("yarn.lock")) return "yarn";
  if (files.has("package-lock.json")) return "npm";
  return undefined;
}

function detectServices(files: Map<string, string>, packageJsons: Array<NonNullable<ReturnType<typeof parsePackageJson>>>): ServiceType[] {
  const haystack = [Array.from(files.values()).join("\n"), JSON.stringify(packageJsons)].join("\n").toLowerCase();
  const services = new Set<ServiceType>();

  if (haystack.includes("postgres") || haystack.includes("prisma") || haystack.includes("database_url")) services.add("postgres");
  if (haystack.includes("redis") || haystack.includes("bullmq")) services.add("redis");
  if (haystack.includes("s3") || haystack.includes("minio") || haystack.includes("aws_")) services.add("minio");
  if (haystack.includes("rabbitmq") || haystack.includes("amqp")) services.add("rabbitmq");
  if (haystack.includes("worker") || haystack.includes("queue")) services.add("worker");
  if (haystack.includes("cron") || haystack.includes("schedule")) services.add("cron");

  return Array.from(services);
}

function detectEnvVars(files: Map<string, string>, packageJsons: Array<NonNullable<ReturnType<typeof parsePackageJson>>>) {
  const envNames = new Set<string>();
  const source = [files.get(".env.example"), files.get(".env.sample"), files.get("README.md")]
    .filter(Boolean)
    .concat(JSON.stringify(packageJsons))
    .join("\n");

  for (const match of source.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) {
    const value = match[0];
    if (["README", "HTTP", "HTTPS", "JSON", "API"].includes(value)) continue;
    envNames.add(value);
  }

  return Array.from(envNames).sort().slice(0, 40);
}

function mergePackageDeps(packageJsons: Array<NonNullable<ReturnType<typeof parsePackageJson>>>) {
  return packageJsons.reduce<Record<string, string>>((acc, packageJson) => {
    return { ...acc, ...packageJson.dependencies, ...packageJson.devDependencies };
  }, {});
}

function isPackageJson(packageJson: ReturnType<typeof parsePackageJson>): packageJson is NonNullable<ReturnType<typeof parsePackageJson>> {
  return packageJson !== null;
}
