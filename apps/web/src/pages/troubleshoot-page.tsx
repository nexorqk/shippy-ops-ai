import { TroubleshootingInputSchema } from "@shippy-ops-ai/shared";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Textarea, Input } from "@shippy-ops-ai/ui";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Stethoscope } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";

export function TroubleshootPage() {
  const [title, setTitle] = useState("Deployment troubleshooting");
  const [logs, setLogs] = useState("");
  const [context, setContext] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.troubleshoot(TroubleshootingInputSchema.parse({ title, logs, context }))
  });

  const report = mutation.data?.report;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Troubleshoot deployment logs</h1>
          <p className="mt-1 text-sm text-slate-500">Paste build, runtime, proxy, or database logs. Commands are classified by operational risk.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Do not paste secrets. Redact tokens, passwords, and private URLs before generating a report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Context</Label>
              <Input value={context} placeholder="Coolify, Dokploy, Docker Compose, framework, recent change" onChange={(event) => setContext(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Logs</Label>
              <Textarea className="min-h-72 font-mono" value={logs} onChange={(event) => setLogs(event.target.value)} />
            </div>
            {mutation.error ? <p className="text-sm text-red-600">{(mutation.error as Error).message}</p> : null}
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Stethoscope size={16} />}
              Generate report
            </Button>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        {!report ? (
          <Card>
            <CardHeader>
              <CardTitle>No report yet</CardTitle>
              <CardDescription>The result will show likely root cause, diagnostic commands, fixes, and prevention notes.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge>{report.confidence} confidence</Badge>
                  <Badge>{report.severity} severity</Badge>
                </div>
                <CardTitle>{report.likelyRootCause}</CardTitle>
                <CardDescription>{report.explanation}</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diagnostic commands</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.diagnosticSteps.map((step) => (
                  <div key={step.command} className="rounded-md border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <code className="text-sm text-slate-950">{step.command}</code>
                      <Badge>{step.risk}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{step.purpose}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fixes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.fixes.map((fix) => (
                  <div key={fix.title}>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-sm font-medium text-slate-950">{fix.title}</h3>
                      <Badge>{fix.risk} risk</Badge>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {fix.steps.map((step) => <li key={step}>- {step}</li>)}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </aside>
    </div>
  );
}
