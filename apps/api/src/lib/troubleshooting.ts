import type { TroubleshootingInput, TroubleshootingReport } from "@shippy-ops-ai/shared";
import { TroubleshootingReportSchema } from "@shippy-ops-ai/shared";

export function buildTroubleshootingReport(input: TroubleshootingInput): TroubleshootingReport {
  const logs = input.logs.toLowerCase();
  const match = rules.find((rule) => rule.match(logs)) ?? fallbackRule;

  return TroubleshootingReportSchema.parse({
    likelyRootCause: match.rootCause,
    confidence: match.confidence,
    severity: match.severity,
    explanation: match.explanation(input),
    diagnosticSteps: match.diagnosticSteps,
    fixes: match.fixes,
    prevention: [
      "Keep required environment variable names documented in .env.example.",
      "Deploy to a staging domain before switching production DNS.",
      "Read build and runtime logs before changing infrastructure.",
      "Back up persistent data before running migrations or destructive commands."
    ]
  });
}

const rules = [
  {
    match: (logs: string) => logs.includes("502") || logs.includes("bad gateway"),
    rootCause: "The reverse proxy cannot reach a healthy application process.",
    confidence: "high" as const,
    severity: "high" as const,
    explanation: (input: TroubleshootingInput) =>
      `The logs for "${input.title}" indicate a proxy-level failure. The container may be crashed, listening on a different port, or failing health checks.`,
    diagnosticSteps: [
      { command: "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'", purpose: "Check whether the application container is running and which ports are exposed.", risk: "read_only" as const },
      { command: "docker logs --tail=200 <container-name>", purpose: "Read recent application startup errors.", risk: "read_only" as const },
      { command: "curl -I http://127.0.0.1:<app-port>", purpose: "Confirm the app responds on the expected internal port.", risk: "read_only" as const }
    ],
    fixes: [
      { title: "Align app port and proxy target", steps: ["Confirm the app binds to 0.0.0.0, not localhost.", "Set the deployment target port to the same port the app listens on.", "Redeploy and recheck logs."], risk: "low" as const }
    ]
  },
  {
    match: (logs: string) => logs.includes("database_url") || logs.includes("connection refused") || logs.includes("could not connect") || logs.includes("prisma"),
    rootCause: "The application cannot connect to its database with the current connection string.",
    confidence: "high" as const,
    severity: "high" as const,
    explanation: () => "The error points to a missing or incorrect database connection string, an unreachable database host, or migrations running before the database is ready.",
    diagnosticSteps: [
      { command: "printenv | sort | grep -E 'DATABASE_URL|POSTGRES|DB_'", purpose: "Verify database-related environment variable names are present without printing secret values in shared logs.", risk: "read_only" as const },
      { command: "docker compose ps postgres", purpose: "Check PostgreSQL service status when using Docker Compose.", risk: "read_only" as const },
      { command: "docker logs --tail=100 <postgres-container>", purpose: "Read PostgreSQL startup and authentication errors.", risk: "read_only" as const }
    ],
    fixes: [
      { title: "Use internal service hostname", steps: ["Do not use localhost from inside an app container.", "Use the Docker Compose or platform service hostname.", "Update DATABASE_URL in the deployment platform and restart the app."], risk: "low" as const },
      { title: "Run migrations intentionally", steps: ["Back up production data first.", "Run migration commands as a release task, not casually from a shell.", "Check app logs after migration completes."], risk: "high" as const }
    ]
  },
  {
    match: (logs: string) => logs.includes("pnpm install") || logs.includes("npm install") || logs.includes("lockfile") || logs.includes("frozen-lockfile"),
    rootCause: "Dependency installation failed because package manager and lockfile expectations do not match.",
    confidence: "medium" as const,
    severity: "medium" as const,
    explanation: () => "The build logs suggest the Dockerfile or platform build command is using a different package manager than the committed lockfile.",
    diagnosticSteps: [
      { command: "ls -la package.json pnpm-lock.yaml package-lock.json yarn.lock bun.lockb", purpose: "Check which package manager files are committed.", risk: "read_only" as const },
      { command: "cat package.json", purpose: "Review packageManager and scripts fields.", risk: "read_only" as const }
    ],
    fixes: [
      { title: "Use one package manager consistently", steps: ["Commit the correct lockfile.", "Update Dockerfile install commands to match the lockfile.", "Rebuild without using stale build cache if needed."], risk: "low" as const }
    ]
  }
];

const fallbackRule = {
  rootCause: "The logs do not match a specific known deployment failure pattern yet.",
  confidence: "low" as const,
  severity: "medium" as const,
  explanation: (input: TroubleshootingInput) =>
    `The provided logs for "${input.title}" need manual review. Start with read-only checks, then narrow the failure to build, runtime, database, or proxy layers.`,
  diagnosticSteps: [
    { command: "docker ps", purpose: "List running containers.", risk: "read_only" as const },
    { command: "docker logs --tail=200 <container-name>", purpose: "Read recent application logs.", risk: "read_only" as const },
    { command: "docker compose config", purpose: "Validate compose configuration after interpolation.", risk: "read_only" as const }
  ],
  fixes: [
    { title: "Classify the failure layer", steps: ["Check whether the failure happens during build or runtime.", "Verify required environment variable names.", "Check service health before restarting containers."], risk: "low" as const }
  ]
};
