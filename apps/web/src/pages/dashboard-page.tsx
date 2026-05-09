import { deploymentTargetLabels, frameworkLabels } from "@shippy-ops-ai/shared";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shippy-ops-ai/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Database, FolderPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects
  });

  const projects = data?.projects ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Deployment projects</h1>
          <p className="mt-1 text-sm text-slate-500">Create a project, generate a fast plan, and inspect saved artifacts.</p>
        </div>
        <Link to="/projects/new">
          <Button>
            <FolderPlus size={16} />
            New project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Projects" value={projects.length.toString()} />
        <MetricCard label="Fast plans" value={projects.filter((project) => project.jobs?.[0]?.type === "fast_plan").length.toString()} />
        <MetricCard label="Free monthly limit" value="3" />
      </div>

      {isLoading ? <Card><CardContent className="pt-5 text-sm text-slate-500">Loading projects...</CardContent></Card> : null}
      {error ? <Card><CardContent className="pt-5 text-sm text-red-600">{(error as Error).message}</CardContent></Card> : null}

      {!isLoading && projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No deployment projects yet</CardTitle>
            <CardDescription>Start with a template-based plan. It will save Dockerfile, Compose, env example, checklist and report artifacts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/projects/new">
              <Button>
                <FolderPlus size={16} />
                Create first project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>{project.domain}</CardDescription>
                </div>
                <Badge>{project.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{frameworkLabels[project.framework]}</Badge>
                <Badge>{deploymentTargetLabels[project.deploymentTarget]}</Badge>
                <Badge>{project.packageManager}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Database size={15} />
                {project.services.length > 0 ? project.services.map((service) => service.name).join(", ") : "No services selected"}
              </div>
              {project.jobs?.[0] ? (
                <Link
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-950 hover:text-slate-700"
                  to={`/projects/${project.id}/jobs/${project.jobs[0].id}`}
                >
                  Open latest result
                  <ArrowRight size={15} />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-2xl font-semibold text-slate-950">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </CardContent>
    </Card>
  );
}
