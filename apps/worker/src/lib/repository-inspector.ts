import type { Framework, PackageManager, RepositoryInspection, ServiceType } from "@shippy-ops-ai/shared";
import { RepositoryInspectionSchema } from "@shippy-ops-ai/shared";

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
  ".env.example",
  "README.md",
  "next.config.js",
  "vite.config.ts",
  "nest-cli.json",
  "go.mod"
] as const;

export async function inspectRepositoryIfAvailable(repositoryUrl: string | null): Promise<RepositoryInspection | null> {
  if (!repositoryUrl) return null;

  try {
    const ref = parseGitHubRepositoryUrl(repositoryUrl);
    const branches = ref.branch ? [ref.branch] : ["main", "master"];
    const files = new Map<string, string>();
    let resolvedBranch = ref.branch;

    for (const branch of branches) {
      const branchFiles = await fetchAllowlistedFiles(ref, branch);
      if (branchFiles.size > 0) {
        resolvedBranch = branch;
        for (const [path, content] of branchFiles) files.set(path, content);
        break;
      }
    }

    const packageJsons = Array.from(files)
      .filter(([path]) => path.endsWith("package.json"))
      .map(([, content]) => parsePackageJson(content))
      .filter(isPackageJson);

    return RepositoryInspectionSchema.parse({
      repositoryUrl,
      provider: "github",
      owner: ref.owner,
      repo: ref.repo,
      branch: resolvedBranch,
      filesFound: Array.from(files.keys()).sort(),
      detectedFramework: detectFramework(files, packageJsons),
      detectedPackageManager: detectPackageManager(files),
      detectedServices: detectServices(files, packageJsons),
      detectedEnvVars: detectEnvVars(files, packageJsons),
      notes: files.size > 0 ? [`Read ${files.size} allowlisted repository files without executing code.`] : ["No allowlisted public repository files were readable."]
    });
  } catch (error) {
    return RepositoryInspectionSchema.parse({
      repositoryUrl,
      provider: "github",
      owner: "unknown",
      repo: "unknown",
      filesFound: [],
      detectedServices: [],
      detectedEnvVars: [],
      notes: [error instanceof Error ? error.message : "Repository inspection failed."]
    });
  }
}

function parseGitHubRepositoryUrl(repositoryUrl: string) {
  const url = new URL(repositoryUrl);
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("Only public github.com repository URLs are supported for inspection.");
  }
  const [owner, repoWithSuffix, maybeTree, branch] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repoWithSuffix) throw new Error("GitHub repository URL must include owner and repository.");
  return { owner, repo: repoWithSuffix.replace(/\.git$/, ""), branch: maybeTree === "tree" ? branch : undefined };
}

async function fetchAllowlistedFiles(ref: { owner: string; repo: string }, branch: string) {
  const files = new Map<string, string>();

  await Promise.all(
    fileAllowlist.map(async (path) => {
      const response = await fetch(`https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${branch}/${path}`, { redirect: "error" });
      if (!response.ok) return;
      const text = await response.text();
      if (text.length <= 200_000) files.set(path, text);
    })
  );

  return files;
}

function parsePackageJson(content: string | undefined) {
  if (!content) return null;
  try {
    return JSON.parse(content) as { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  } catch {
    return null;
  }
}

function detectFramework(files: Map<string, string>, packageJsons: Array<NonNullable<ReturnType<typeof parsePackageJson>>>): Framework | undefined {
  const deps = mergePackageDeps(packageJsons);
  if (deps.next || files.has("next.config.js")) return "nextjs";
  if (deps["@nestjs/core"] || files.has("nest-cli.json")) return "nestjs";
  if (deps.express) return "express";
  if (files.has("go.mod")) return "go_api";
  if (deps.vite || files.has("vite.config.ts")) return "react_spa";
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
  const haystack = `${Array.from(files.values()).join("\n")}\n${JSON.stringify(packageJsons)}`.toLowerCase();
  const services = new Set<ServiceType>();
  if (haystack.includes("database_url") || haystack.includes("postgres") || haystack.includes("prisma")) services.add("postgres");
  if (haystack.includes("redis") || haystack.includes("bullmq")) services.add("redis");
  if (haystack.includes("minio") || haystack.includes("s3")) services.add("minio");
  return Array.from(services);
}

function detectEnvVars(files: Map<string, string>, packageJsons: Array<NonNullable<ReturnType<typeof parsePackageJson>>>) {
  const source = [files.get(".env.example"), files.get("README.md"), JSON.stringify(packageJsons)].filter(Boolean).join("\n");
  return Array.from(new Set(Array.from(source.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)).map((match) => match[0]))).sort().slice(0, 40);
}

function mergePackageDeps(packageJsons: Array<NonNullable<ReturnType<typeof parsePackageJson>>>) {
  return packageJsons.reduce<Record<string, string>>((acc, packageJson) => {
    return { ...acc, ...packageJson.dependencies, ...packageJson.devDependencies };
  }, {});
}

function isPackageJson(packageJson: ReturnType<typeof parsePackageJson>): packageJson is NonNullable<ReturnType<typeof parsePackageJson>> {
  return packageJson !== null;
}
