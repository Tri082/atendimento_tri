import { redirect } from "next/navigation";
import { requireOrgRole } from "@/lib/auth/guards";
import { createAutomationAction } from "@/lib/automations/actions.server";
import { listTriggers } from "@/lib/automations/registry";
import { TriggerPicker } from "./_components/trigger-picker";

export const metadata = { title: "Nova automação" };

export default async function NovaAutomacaoPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });

  async function create(triggerType: string): Promise<void> {
    "use server";
    const result = await createAutomationAction({
      orgSlug,
      name: "Nova automação",
      description: null,
      trigger_type: triggerType,
      trigger_config: {},
      conditions: [],
      actions: [
        // Placeholder mínimo (1 action exigido por schema). Será editado.
        { type: "create_task", config: { title: "Tarefa exemplo" }, on_error: "stop" },
      ],
      status: "draft",
    });
    if (result.ok && result.data) {
      redirect(`/app/${orgSlug}/automacoes/${result.data.id}`);
    }
    // Se falhou: redirect leva pra lista (TODO: error UI)
    redirect(`/app/${orgSlug}/automacoes`);
  }

  const triggers = listTriggers().map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1.5">
        <span className="label-mono">/ nova automação</span>
        <h1 className="font-semibold text-3xl tracking-tight">Quando esta automação deve rodar?</h1>
        <p className="text-muted-foreground text-sm">
          Escolha o evento que vai disparar a automação. Você poderá adicionar condições e ações depois.
        </p>
      </div>
      <TriggerPicker triggers={triggers} onPick={create} />
    </div>
  );
}
