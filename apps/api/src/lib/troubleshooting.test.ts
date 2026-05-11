import { describe, expect, it } from "vitest";
import { buildTroubleshootingReport } from "./troubleshooting.js";

describe("troubleshooting report", () => {
  it("classifies 502 logs as proxy/runtime failures", () => {
    const report = buildTroubleshootingReport({
      title: "Coolify 502",
      logs: "502 Bad Gateway while opening app.example.com",
      context: "Coolify"
    });

    expect(report.severity).toBe("high");
    expect(report.likelyRootCause).toContain("reverse proxy");
    expect(report.diagnosticSteps.every((step) => step.risk === "read_only")).toBe(true);
  });

  it("classifies DATABASE_URL errors as database connectivity failures", () => {
    const report = buildTroubleshootingReport({
      title: "Prisma start failure",
      logs: "Error: DATABASE_URL is undefined. Prisma could not connect.",
      context: "Docker Compose"
    });

    expect(report.likelyRootCause).toContain("database");
    expect(report.fixes.some((fix) => fix.risk === "high")).toBe(true);
  });
});
