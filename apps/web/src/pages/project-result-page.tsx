import type { DeploymentPlan } from "@shippy-ops-ai/shared";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, SecondaryButton } from "@shippy-ops-ai/ui";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clipboard, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ApiArtifact } from "../lib/api";

const tabs = ["Overview", "Checklist", "Dockerfile", "docker-compose.yml", ".env.example", "Report"] as const;
type Tab = (typeof tabs)[number];

export function ProjectResultPage() {
  const { jobId } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const { data, isLoading, error } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId!),
    enabled: Boolean(jobId)
  });

  const artifacts = data?.job.artifacts ?? [];
  const plan = useMemo(() => parsePlan(artifacts), [artifacts]);

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
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{data.job.status}</Badge>
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Deployment plan result</h1>
          <p className="mt-1 text-sm text-slate-500">Saved artifacts from the fast template generation job.</p>
        </div>
        <Link to="/projects/new">
          <SecondaryButton>Generate another plan</SecondaryButton>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500" style={{ width: `${data.job.progress}%` }} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {data.job.events?.map((event) => (
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
      {activeTab === "Checklist" && plan ? <Checklist plan={plan} /> : null}
      {activeTab === "Dockerfile" ? <ArtifactBlock artifact={findArtifact(artifacts, "Dockerfile")} /> : null}
      {activeTab === "docker-compose.yml" ? <ArtifactBlock artifact={findArtifact(artifacts, "docker-compose.yml")} /> : null}
      {activeTab === ".env.example" ? <ArtifactBlock artifact={findArtifact(artifacts, ".env.example")} /> : null}
      {activeTab === "Report" ? <ArtifactBlock artifact={findArtifact(artifacts, "deployment-report.md")} /> : null}
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

function ArtifactBlock({ artifact }: { artifact?: ApiArtifact }) {
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
          <Button type="button" onClick={() => navigator.clipboard.writeText(artifact.contentText ?? "")}>
            <Clipboard size={16} />
            Copy
          </Button>
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

function findArtifact(artifacts: ApiArtifact[], filename: string) {
  return artifacts.find((artifact) => artifact.filename === filename);
}
