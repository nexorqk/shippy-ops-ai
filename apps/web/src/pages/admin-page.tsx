import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shippy-ops-ai/ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function AdminPage() {
  const metricsQuery = useQuery({ queryKey: ["admin", "metrics"], queryFn: api.adminMetrics });
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: api.adminUsers });
  const jobsQuery = useQuery({ queryKey: ["admin", "jobs"], queryFn: api.adminJobs });

  if (metricsQuery.error || usersQuery.error || jobsQuery.error) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm text-red-600">
          {(metricsQuery.error as Error)?.message || (usersQuery.error as Error)?.message || (jobsQuery.error as Error)?.message}
        </CardContent>
      </Card>
    );
  }

  const metrics = metricsQuery.data?.metrics;
  const users = usersQuery.data?.users ?? [];
  const jobs = jobsQuery.data?.jobs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">MVP operations view for users, projects, jobs, failures, and troubleshooting reports.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Users" value={metrics?.users ?? 0} />
        <Metric label="Projects" value={metrics?.projects ?? 0} />
        <Metric label="Jobs" value={metrics?.jobs ?? 0} />
        <Metric label="Failed jobs" value={metrics?.failedJobs ?? 0} />
        <Metric label="Templates" value={metrics?.templates ?? 0} />
        <Metric label="Troubleshooting" value={metrics?.troubleshootingReports ?? 0} />
        <Metric label="MRR" value={`$${metrics?.mrr ?? 0}`} />
        <Metric label="Churn" value={`${metrics?.churn ?? 0}%`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Latest users and local demo accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <div className="text-sm font-medium text-slate-950">{user.email}</div>
                  <div className="text-xs text-slate-500">{user._count.projects} projects, {user._count.jobs} jobs</div>
                </div>
                <Badge>{user.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
            <CardDescription>Generation and troubleshooting jobs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.slice(0, 12).map((job) => (
              <div key={job.id} className="rounded-md border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge>{job.type}</Badge>
                  <Badge>{job.status}</Badge>
                  <span className="text-xs text-slate-500">{job.progress}%</span>
                </div>
                <div className="text-sm font-medium text-slate-950">{job.project?.name ?? "No project"}</div>
                <div className="text-xs text-slate-500">{job.user.email}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-2xl font-semibold text-slate-950">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </CardContent>
    </Card>
  );
}
