import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgRole } from "@/lib/auth/guards";
import {
  getAutomationMetrics,
  listAutomations,
} from "@/lib/automations/queries";
import { TEMPLATES } from "@/lib/automations/templates";
import { TRIGGERS } from "@/lib/automations/registry";
import { AutomationCard } from "./_components/automation-card";
import { TemplateCard } from "./_components/template-card";
import { EmptyState } from "./_components/empty-state";

export const metadata = { title: "Automações" };

export default async function AutomacoesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });
  const automations = await listAutomations(org.id);

  // Sub-H Round-2 #5: integra getAutomationMetrics na UI (antes era dead code).
  // Paralelo via Promise.all pra não serializar N requests.
  const automationsWithMetrics = await Promise.all(
    automations.map(async (a) => ({
      automation: a,
      metrics: await getAutomationMetrics(org.id, a.id),
    })),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <span className="label-mono">/ automações</span>
          <h1 className="font-semibold text-3xl tracking-tight">Automações</h1>
          <p className="text-muted-foreground text-sm">
            Crie regras automáticas pro CRM agir sozinho — capture leads, mande follow-ups,
            integre com outros sistemas.
          </p>
        </div>
        <Button render={<Link href={`/app/${orgSlug}/automacoes/nova`} />} nativeButton={false}>
          + Criar do zero
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ modelos prontos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} orgSlug={orgSlug} template={t} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ suas automações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {automations.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-border">
              {automationsWithMetrics.map(({ automation: a, metrics }) => (
                <li key={a.id}>
                  <AutomationCard
                    orgSlug={orgSlug}
                    automation={a}
                    triggerLabel={TRIGGERS[a.trigger_type]?.label ?? a.trigger_type}
                    metrics={metrics}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
