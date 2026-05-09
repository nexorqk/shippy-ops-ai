import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateProjectSchema,
  deploymentTargetLabels,
  Framework,
  frameworkLabels,
  PackageManager,
  ServiceType,
  serviceLabels
} from "@shippy-ops-ai/shared";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, SecondaryButton, Textarea } from "@shippy-ops-ai/ui";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";
import { api } from "../lib/api";

type FormInput = z.input<typeof CreateProjectSchema>;
type FormValues = z.output<typeof CreateProjectSchema>;

const frameworks = Object.keys(frameworkLabels) as Framework[];
const packageManagers: PackageManager[] = ["pnpm", "npm", "yarn", "bun"];
const services: ServiceType[] = ["postgres", "redis", "minio", "rabbitmq", "worker", "cron"];

export function NewProjectPage() {
  const navigate = useNavigate();
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(["postgres"]);
  const [envText, setEnvText] = useState("DATABASE_URL\nAPP_URL");

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: "",
      repositoryUrl: "",
      framework: "react_spa",
      packageManager: "pnpm",
      deploymentTarget: "coolify",
      domain: "app.example.com",
      runtimeVersion: "Node.js 22",
      services: [],
      environmentVariables: []
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const input: FormValues = {
        ...values,
        services: selectedServices.map((service) => ({
          type: service,
          name: serviceLabels[service],
          required: true,
          notes: ""
        })),
        environmentVariables: envText
          .split(/\n|,/)
          .map((key) => key.trim().toUpperCase())
          .filter(Boolean)
          .map((key) => ({ key, required: true, description: "", isSecret: key.includes("SECRET") || key.includes("TOKEN") || key.includes("KEY") }))
      };
      const { project } = await api.createProject(input);
      const { job } = await api.generateFastPlan(project.id);
      return { project, job };
    },
    onSuccess: ({ project, job }) => {
      navigate(`/projects/${project.id}/jobs/${job.id}`);
    }
  });

  const selectedTarget = form.watch("deploymentTarget");
  const selectedFramework = form.watch("framework");
  const scenario = useMemo(() => `${frameworkLabels[selectedFramework]} on ${deploymentTargetLabels[selectedTarget]}`, [selectedFramework, selectedTarget]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Create deployment project</h1>
        <p className="mt-1 text-sm text-slate-500">This MVP creates the project and immediately generates a fast template-based plan.</p>
      </div>

      <form className="grid gap-6 lg:grid-cols-[1fr_320px]" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project source</CardTitle>
              <CardDescription>GitHub URL is optional for the fast flow; full repository analysis comes later.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Project name" error={form.formState.errors.name?.message}>
                <Input placeholder="Acme dashboard" {...form.register("name")} />
              </Field>
              <Field label="GitHub repository URL" error={form.formState.errors.repositoryUrl?.message}>
                <Input placeholder="https://github.com/acme/app" {...form.register("repositoryUrl")} />
              </Field>
              <Field label="Domain" error={form.formState.errors.domain?.message}>
                <Input placeholder="app.example.com" {...form.register("domain")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stack and target</CardTitle>
              <CardDescription>Choose the scenario that best matches the deployment.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Framework">
                <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" {...form.register("framework")}>
                  {frameworks.map((framework) => (
                    <option key={framework} value={framework}>
                      {frameworkLabels[framework]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Package manager">
                <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" {...form.register("packageManager")}>
                  {packageManagers.map((manager) => (
                    <option key={manager} value={manager}>
                      {manager}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Deployment target">
                <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" {...form.register("deploymentTarget")}>
                  {Object.entries(deploymentTargetLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Runtime version">
                <Input placeholder="Node.js 22" {...form.register("runtimeVersion")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services and environment variables</CardTitle>
              <CardDescription>Store variable names only. Do not paste real secrets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {services.map((service) => (
                  <button
                    type="button"
                    key={service}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                      selectedServices.includes(service) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setSelectedServices((current) =>
                        current.includes(service) ? current.filter((item) => item !== service) : [...current, service]
                      );
                    }}
                  >
                    {serviceLabels[service]}
                  </button>
                ))}
              </div>
              <Field label="Environment variable names">
                <Textarea value={envText} onChange={(event) => setEnvText(event.target.value)} />
              </Field>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fast plan preview</CardTitle>
              <CardDescription>{scenario}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((service) => (
                  <Badge key={service}>{serviceLabels[service]}</Badge>
                ))}
              </div>
              <p className="text-sm leading-6 text-slate-500">
                The API will create a project, select the closest template, generate artifacts, and persist the completed job.
              </p>
              {mutation.error ? <p className="text-sm text-red-600">{(mutation.error as Error).message}</p> : null}
              <Button className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                Generate fast plan
              </Button>
              <SecondaryButton type="button" className="w-full" onClick={() => form.reset()}>
                Reset form
              </SecondaryButton>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
