import type { DeploymentPlan } from "@shippy-ops-ai/shared";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, SecondaryButton } from "@shippy-ops-ai/ui";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clipboard, Download, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ApiArtifact } from "../lib/api";

const tabs = ["Overview", "Checklist", "Dockerfile", "docker-compose.yml", ".env.example", "Coolify", "Dokploy", "DNS/HTTPS", "Security", "Troubleshooting", "Report"] as const;
type Tab = (typeof tabs)[number];

export function ProjectResultPage() {
  const { jobId } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [liveEvents, setLiveEvents] = useState<Array<{ id: string; type: string; message: string; createdAt: string }>>([]);
  const [liveSnapshot, setLiveSnapshot] = useState<{ status: string; progress: number; currentStep: string | null } | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId!),
    enabled: Boolean(jobId)
  });

  const artifacts = data?.job.artifacts ?? [];
  const plan = useMemo(() => parsePlan(artifacts), [artifacts]);
  const status = liveSnapshot?.status ?? data?.job.status;
  const progress = liveSnapshot?.progress ?? data?.job.progress ?? 0;
  const currentStep = liveSnapshot?.currentStep ?? data?.job.currentStep;
  const events = liveEvents.length > 0 ? liveEvents : data?.job.events ?? [];

  useEffect(() => {
    if (!jobId || !data?.job || ["completed", "failed", "canceled"].includes(data.job.status)) return;

    const source = new EventSource(api.jobStreamUrl(jobId));

    source.addEventListener("snapshot", (event) => {
      const snapshot = JSON.parse(event.data) as { status: string; progress: number; currentStep: string | null };
      setLiveSnapshot(snapshot);

      if (["completed", "failed", "canceled"].includes(snapshot.status)) {
        void refetch();
        source.close();
      }
    });

    const addProgressEvent = (event: MessageEvent<string>) => {
      const parsed = JSON.parse(event.data) as { id?: string; type: string; message: string; createdAt?: string };
      if (!parsed.id) return;
      const eventId = parsed.id;
      setLiveEvents((current) => {
        if (current.some((item) => item.id === eventId)) return current;
        return [...current, { id: eventId, type: parsed.type, message: parsed.message, createdAt: parsed.createdAt ?? new Date().toISOString() }];
      });
    };

    [
      "queued",
      "starting_full_generation",
      "fetching_repository",
      "analyzing_project_structure",
      "detecting_framework",
      "checking_environment_requirements",
      "generating_dockerfile",
      "generating_compose_file",
      "generating_troubleshooting_guide",
      "exporting_report",
      "completed",
      "failed"
    ].forEach((eventName) => source.addEventListener(eventName, addProgressEvent));

    return () => source.close();
  }, [data?.job, jobId, refetch]);

  if (isLoading) {
    return <Card><CardContent className="pt-5 text-sm text-slate-500">Loading generation result...</CardContent></Card>;
  }

  if (error || !data?.job) {
    return <Card><CardContent className="pt-5 text-sm text-red-600">{(error as Error)?.message ?? "Job not found"}</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge>{data.job.type}</Badge>
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{status}</Badge>
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Deployment plan result</h1>
          <p className="mt-1 text-sm text-slate-500">Saved artifacts and deployment guidance from the generation job.</p>
        </div>
        <Link to="/projects/new">
          <SecondaryButton>Generate another plan</SecondaryButton>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mb-4 text-sm text-slate-500">Current step: {currentStep ?? "queued"}</div>
          <div className="grid gap-3 md:grid-cols-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 text-emerald-600" size={16} />
                <span>{event.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === tab ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && plan ? <Overview plan={plan} /> : null}
      {activeTab === "Overview" && !plan ? <PendingArtifacts /> : null}
      {activeTab === "Checklist" && plan ? <Checklist plan={plan} /> : null}
      {activeTab === "Checklist" && !plan ? <PendingArtifacts /> : null}
      {activeTab === "Dockerfile" ? <ArtifactBlock artifact={findArtifact(artifacts, "Dockerfile")} /> : null}
      {activeTab === "docker-compose.yml" ? <ArtifactBlock artifact={findArtifact(artifacts, "docker-compose.yml")} /> : null}
      {activeTab === ".env.example" ? <ArtifactBlock artifact={findArtifact(artifacts, ".env.example")} /> : null}
      {activeTab === "Coolify" && plan ? <StepList title="Coolify steps" steps={plan.coolifySteps} /> : null}
      {activeTab === "Dokploy" && plan ? <StepList title="Dokploy steps" steps={plan.dokploySteps} /> : null}
      {activeTab === "DNS/HTTPS" && plan ? <StepList title="DNS and HTTPS" steps={plan.dnsSteps} /> : null}
      {activeTab === "Security" && plan ? <StepList title="Security notes" steps={plan.securityNotes} /> : null}
      {activeTab === "Troubleshooting" && plan ? <TroubleshootingList plan={plan} /> : null}
      {["Coolify", "Dokploy", "DNS/HTTPS", "Security", "Troubleshooting"].includes(activeTab) && !plan ? <PendingArtifacts /> : null}
      {activeTab === "Report" ? <ArtifactBlock artifact={findArtifact(artifacts, "deployment-report.md")} downloadable /> : null}
    </div>
  );
}

function Overview({ plan }: { plan: DeploymentPlan }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>{plan.summary}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {Object.entries(plan.detectedStack).map(([key, value]) =>
            value ? (
              <div key={key} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs uppercase text-slate-400">{key}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
              </div>
            ) : null
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>DNS and security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {plan.dnsSteps.slice(0, 2).map((step) => <p key={step}>{step}</p>)}
          {plan.securityNotes.slice(0, 2).map((step) => <p key={step}>{step}</p>)}
        </CardContent>
      </Card>
    </div>
  );
}

function Checklist({ plan }: { plan: DeploymentPlan }) {
  return (
    <div className="grid gap-3">
      {plan.checklist.map((item) => (
        <Card key={item.title}>
          <CardContent className="flex items-start gap-3 pt-5">
            <Badge>{item.severity}</Badge>
            <div>
              <h3 className="font-medium text-slate-950">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ArtifactBlock({ artifact, downloadable = false }: { artifact?: ApiArtifact; downloadable?: boolean }) {
  if (!artifact?.contentText) {
    return <Card><CardContent className="pt-5 text-sm text-slate-500">Artifact is not available.</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText size={16} />
              {artifact.filename}
            </CardTitle>
            <CardDescription>{artifact.type}</CardDescription>
          </div>
          <div className="flex gap-2">
            {downloadable ? (
              <Button type="button" onClick={() => downloadTextFile(artifact.filename, artifact.contentText ?? "")}>
                <Download size={16} />
                Download
              </Button>
            ) : null}
            <Button type="button" onClick={() => navigator.clipboard.writeText(artifact.contentText ?? "")}>
              <Clipboard size={16} />
              Copy
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[620px] overflow-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100">
          <code>{artifact.contentText}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

function parsePlan(artifacts: ApiArtifact[]): DeploymentPlan | null {
  const json = artifacts.find((artifact) => artifact.filename === "deployment-plan.json")?.contentText;
  if (!json) return null;
  try {
    return JSON.parse(json) as DeploymentPlan;
  } catch {
    return null;
  }
}

function StepList({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div key={step} className="flex gap-3 rounded-md border border-slate-200 p-3 text-sm text-slate-600">
            <Badge>{index + 1}</Badge>
            <span>{step}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TroubleshootingList({ plan }: { plan: DeploymentPlan }) {
  return (
    <div className="grid gap-3">
      {plan.troubleshooting.map((item) => (
        <Card key={item.symptom}>
          <CardHeader>
            <CardTitle>{item.symptom}</CardTitle>
            <CardDescription>{item.likelyCause}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">{item.fix}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function PendingArtifacts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generation in progress</CardTitle>
        <CardDescription>Artifacts will appear here when the worker completes the job.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-slate-500">Keep this page open to watch live SSE progress events.</CardContent>
    </Card>
  );
}

function findArtifact(artifacts: ApiArtifact[], filename: string) {
  return artifacts.find((artifact) => artifact.filename === filename);
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
