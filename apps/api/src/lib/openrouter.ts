import type { TroubleshootingInput, TroubleshootingReport } from "@shippy-ops-ai/shared";
import { TroubleshootingReportJsonSchema, TroubleshootingReportSchema } from "@shippy-ops-ai/shared";

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | object;
    };
  }>;
};

export function isOpenRouterTroubleshootingConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY && (process.env.OPENROUTER_MODEL_FAST || process.env.OPENROUTER_MODEL_STRONG));
}

export async function generateTroubleshootingReportWithOpenRouter(input: TroubleshootingInput): Promise<TroubleshootingReport> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL_FAST || process.env.OPENROUTER_MODEL_STRONG;

  if (!apiKey || !model) {
    throw new Error("OpenRouter troubleshooting model is not configured.");
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
            "You diagnose VPS Docker/Coolify/Dokploy deployment failures. Return only valid JSON matching schema. Classify every command risk. Never present destructive commands as casual fixes."
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            deploymentTarget: input.deploymentTarget,
            context: input.context,
            logs: input.logs
          })
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "troubleshooting_report",
          strict: true,
          schema: TroubleshootingReportJsonSchema
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter troubleshooting failed: ${response.status} ${text.slice(0, 500)}`);
  }

  const payload = (await response.json()) as OpenRouterChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  return TroubleshootingReportSchema.parse(parsed);
}
