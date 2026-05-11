import { TroubleshootingInputSchema } from "@shippy-ops-ai/shared";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { generateTroubleshootingReportWithOpenRouter, isOpenRouterTroubleshootingConfigured } from "../lib/openrouter.js";
import { requireUser } from "../lib/auth.js";
import { buildTroubleshootingReport } from "../lib/troubleshooting.js";

export async function registerTroubleshootRoutes(app: FastifyInstance) {
  app.post("/troubleshoot", async (request, reply) => {
    const input = TroubleshootingInputSchema.parse(request.body);
    const user = await requireUser(request, reply);
    if (!user) return;
    const generation = await generateReport(input);
    const report = generation.report;

    const job = await prisma.generationJob.create({
      data: {
        userId: user.id,
        projectId: input.projectId || null,
        type: "troubleshooting",
        status: "completed",
        currentStep: "completed",
        progress: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        events: {
          create: [
            { type: "queued", message: "Troubleshooting report queued." },
            { type: "completed", message: "Troubleshooting report completed.", metadataJson: { mode: generation.mode, fallbackReason: generation.fallbackReason } }
          ]
        },
        artifacts: {
          create: [
            {
              projectId: input.projectId || null,
              type: "troubleshooting",
              filename: "troubleshooting-report.json",
              contentText: JSON.stringify(report, null, 2)
            },
            {
              projectId: input.projectId || null,
              type: "markdown_report",
              filename: "troubleshooting-report.md",
              contentText: reportToMarkdown(input.title, report)
            }
          ]
        }
      },
      include: { artifacts: true, events: { orderBy: { createdAt: "asc" } } }
    });

    return reply.code(201).send({ job, report });
  });
}

async function generateReport(input: ReturnType<typeof TroubleshootingInputSchema.parse>) {
  if (!isOpenRouterTroubleshootingConfigured()) {
    return {
      mode: "rules",
      fallbackReason: "OpenRouter is not configured.",
      report: buildTroubleshootingReport(input)
    };
  }

  try {
    return {
      mode: "openrouter",
      fallbackReason: null,
      report: await generateTroubleshootingReportWithOpenRouter(input)
    };
  } catch (error) {
    return {
      mode: "rules",
      fallbackReason: error instanceof Error ? error.message : "OpenRouter troubleshooting failed.",
      report: buildTroubleshootingReport(input)
    };
  }
}

function reportToMarkdown(title: string, report: ReturnType<typeof buildTroubleshootingReport>) {
  return `# ${title}

## Likely Root Cause

${report.likelyRootCause}

Confidence: ${report.confidence}

Severity: ${report.severity}

## Explanation

${report.explanation}

## Diagnostic Steps

${report.diagnosticSteps.map((step) => `- \`${step.command}\` (${step.risk}): ${step.purpose}`).join("\n")}

## Fixes

${report.fixes.map((fix) => `### ${fix.title}\n\nRisk: ${fix.risk}\n\n${fix.steps.map((step) => `- ${step}`).join("\n")}`).join("\n\n")}

## Prevention

${report.prevention.map((item) => `- ${item}`).join("\n")}
`;
}
