import { describe, expect, it, vi } from "vitest";
import { inspectGitHubRepository, parseGitHubRepositoryUrl } from "./repository-inspector.js";

describe("repository inspector", () => {
  it("parses normal GitHub repository URLs", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/acme/app")).toEqual({
      owner: "acme",
      repo: "app",
      branch: undefined
    });
  });

  it("rejects non-GitHub hosts", () => {
    expect(() => parseGitHubRepositoryUrl("https://example.com/acme/app")).toThrow("Only public github.com");
  });

  it("detects framework, package manager, env vars, and services from allowlisted files", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/package.json")) {
        return response(JSON.stringify({
          scripts: { build: "vite build" },
          dependencies: { "@vitejs/plugin-react": "latest", prisma: "latest", redis: "latest" },
          devDependencies: { vite: "latest" }
        }));
      }

      if (url.endsWith("/pnpm-lock.yaml")) return response("lockfileVersion: '9.0'");
      if (url.endsWith("/.env.example")) return response("DATABASE_URL=\nREDIS_URL=\nVITE_API_URL=");
      return response("", false);
    });

    const inspection = await inspectGitHubRepository("https://github.com/acme/app", fetchMock as unknown as typeof fetch);

    expect(inspection.detectedFramework).toBe("react_spa");
    expect(inspection.detectedPackageManager).toBe("pnpm");
    expect(inspection.detectedServices).toEqual(expect.arrayContaining(["postgres", "redis"]));
    expect(inspection.detectedEnvVars).toEqual(expect.arrayContaining(["DATABASE_URL", "REDIS_URL", "VITE_API_URL"]));
  });
});

function response(body: string, ok = true) {
  return {
    ok,
    headers: {
      get: () => "text/plain"
    },
    text: async () => body
  };
}
