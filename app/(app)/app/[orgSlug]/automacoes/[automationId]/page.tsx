import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrgRole } from "@/lib/auth/guards";
import { getAutomation } from "@/lib/automations/queries";
import { listActions, listTriggers } from "@/lib/automations/registry";
import { getCompanies } from "@/lib/companies/queries";
import { AutomationForm } from "./_components/automation-form";

export const metadata = { title: "Editar automação" };

export default async function AutomationEditorPage({
  params,
}: {
  params: Promise<{ orgSlug: string; automationId: string }>;
}) {
  const { orgSlug, automationId } = await params;
  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });
  const automation = await getAutomation(org.id, automationId);
  if (!automation) notFound();

  const companies = await getCompanies(org.id);
  const companiesForSelect = companies.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/app/${orgSlug}/automacoes`} />}
          nativeButton={false}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={`/app/${orgSlug}/automacoes/${automationId}/runs`}
            />
          }
          nativeButton={false}
        >
          Histórico
        </Button>
      </div>
      <AutomationForm
        orgSlug={orgSlug}
        companies={companiesForSelect}
        automation={{
          id: automation.id,
          name: automation.name,
          description: automation.description,
          trigger_type: automation.trigger_type,
          trigger_config: (automation.trigger_config ?? {}) as Record<
            string,
            unknown
          >,
          conditions: (automation.conditions ?? []) as Array<{
            field: string;
            op: string;
            value?: unknown;
          }>,
          actions: (automation.actions ?? []) as Array<{
            type: string;
            config: Record<string, unknown>;
            on_error: "stop" | "continue";
          }>,
          status: automation.status as "draft" | "active" | "paused",
        }}
        triggers={listTriggers().map((t) => ({
          id: t.id,
          label: t.label,
          description: t.description,
          variables: t.variables,
        }))}
        actionDefs={listActions().map((a) => ({
          id: a.id,
          label: a.label,
          description: a.description,
          category: a.category,
        }))}
      />
    </div>
  );
}
