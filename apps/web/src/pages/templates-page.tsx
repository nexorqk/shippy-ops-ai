import { deploymentTargetLabels, frameworkLabels } from "@deploypilot/shared";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@deploypilot/ui";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { api } from "../lib/api";

export function TemplatesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates
  });

  const templates = data?.templates ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Template catalog</h1>
        <p className="mt-1 text-sm text-slate-500">Seeded deployment recipes used by the fast generation engine.</p>
      </div>

      {isLoading ? <Card><CardContent className="pt-5 text-sm text-slate-500">Loading templates...</CardContent></Card> : null}
      {error ? <Card><CardContent className="pt-5 text-sm text-red-600">{(error as Error).message}</CardContent></Card> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{template.title}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                <Badge>{template.difficulty}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{frameworkLabels[template.framework as keyof typeof frameworkLabels]}</Badge>
                <Badge>{deploymentTargetLabels[template.deploymentTarget as keyof typeof deploymentTargetLabels]}</Badge>
                {template.requiredServices.map((service) => <Badge key={service}>{service}</Badge>)}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock size={15} />
                Estimated setup: {template.estimatedMinutes} minutes
              </div>
              <p className="text-sm leading-6 text-slate-600">{template.contentMarkdown}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
