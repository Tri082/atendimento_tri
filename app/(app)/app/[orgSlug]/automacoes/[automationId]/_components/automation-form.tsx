"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAutomationAction,
  setAutomationStatusAction,
  updateAutomationAction,
} from "@/lib/automations/actions.server";
import type { CompanyOption } from "@/lib/automations/action-fields";
import { findPlaceholderPaths } from "@/lib/automations/placeholders";
import { ActionsSection } from "./actions-section";
import { ConditionsSection } from "./conditions-section";
import { DryRunPanel } from "./dry-run-panel";
import { FlowDiagram } from "./flow-diagram";
import { PreActivationBanner } from "./pre-activation-banner";
import { TriggerSection } from "./trigger-section";

interface TriggerLite {
  id: string;
  label: string;
  description: string;
  variables: string[];
}
interface ActionDefLite {
  id: string;
  label: string;
  description: string;
  category: string;
}
interface AutomationData {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions: Array<{ field: string; op: string; value?: unknown }>;
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
    on_error: "stop" | "continue";
  }>;
  status: "draft" | "active" | "paused";
}

export function AutomationForm({
  orgSlug,
  automation,
  triggers,
  actionDefs,
  companies,
}: {
  orgSlug: string;
  automation: AutomationData;
  triggers: TriggerLite[];
  actionDefs: ActionDefLite[];
  companies: CompanyOption[];
}) {
  const [data, setData] = useState<AutomationData>(automation);
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const save = () => {
    startTransition(async () => {
      const r = await updateAutomationAction({
        orgSlug,
        id: data.id,
        name: data.name,
        description: data.description,
        trigger_type: data.trigger_type,
        trigger_config: data.trigger_config,
        conditions: data.conditions,
        actions: data.actions,
        status: data.status,
      });
      if (!r.ok) alert(r.error);
      else router.refresh();
    });
  };

  const setStatus = (newStatus: "draft" | "active" | "paused") => {
    startTransition(async () => {
      const r = await setAutomationStatusAction({
        orgSlug,
        id: data.id,
        status: newStatus,
      });
      if (r.ok) {
        setData((d) => ({ ...d, status: newStatus }));
        router.refresh();
      }
    });
  };

  const del = () => {
    if (!confirm("Excluir essa automação? Histórico de runs será mantido."))
      return;
    startTransition(async () => {
      const r = await deleteAutomationAction({ orgSlug, id: data.id });
      if (r.ok) router.push(`/app/${orgSlug}/automacoes`);
    });
  };

  const currentTrigger = triggers.find((t) => t.id === data.trigger_type);

  const placeholderHits = findPlaceholderPaths(data.actions);
  const actionLabelsResolved = data.actions.map(
    (a) => actionDefs.find((ad) => ad.id === a.type)?.label ?? a.type,
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <PreActivationBanner
          hits={placeholderHits}
          actionLabels={actionLabelsResolved}
        />
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={data.description ?? ""}
                onChange={(e) =>
                  setData({ ...data, description: e.target.value || null })
                }
                rows={2}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={data.status === "active" ? "default" : "outline"}
                onClick={() => setStatus("active")}
                disabled={isPending}
              >
                Ativa
              </Button>
              <Button
                size="sm"
                variant={data.status === "paused" ? "default" : "outline"}
                onClick={() => setStatus("paused")}
                disabled={isPending}
              >
                Pausada
              </Button>
              <Button
                size="sm"
                variant={data.status === "draft" ? "default" : "outline"}
                onClick={() => setStatus("draft")}
                disabled={isPending}
              >
                Rascunho
              </Button>
            </div>
          </CardContent>
        </Card>

        <TriggerSection
          triggers={triggers.map((t) => ({
            id: t.id,
            label: t.label,
            description: t.description,
          }))}
          value={{
            triggerType: data.trigger_type,
            triggerConfig: data.trigger_config,
          }}
          onChange={(v) =>
            setData({
              ...data,
              trigger_type: v.triggerType,
              trigger_config: v.triggerConfig,
            })
          }
        />

        <ConditionsSection
          value={data.conditions}
          onChange={(c) => setData({ ...data, conditions: c })}
        />

        <ActionsSection
          actionDefs={actionDefs}
          triggerType={data.trigger_type}
          value={data.actions}
          companies={companies}
          onChange={(a) => setData({ ...data, actions: a })}
        />

        <div className="flex justify-between gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={del}
            disabled={isPending}
          >
            Excluir
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDryRunOpen(true)}
              disabled={isPending}
            >
              <PlayIcon className="h-4 w-4 mr-1" /> Testar
            </Button>
            <Button onClick={save} disabled={isPending}>
              <SaveIcon className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <FlowDiagram
          triggerLabel={currentTrigger?.label ?? data.trigger_type}
          conditionsCount={data.conditions.length}
          actionLabels={data.actions.map(
            (a) =>
              actionDefs.find((ad) => ad.id === a.type)?.label ?? a.type,
          )}
        />
      </div>

      {dryRunOpen && (
        <DryRunPanel
          orgSlug={orgSlug}
          automationId={data.id}
          onClose={() => setDryRunOpen(false)}
        />
      )}
    </div>
  );
}
