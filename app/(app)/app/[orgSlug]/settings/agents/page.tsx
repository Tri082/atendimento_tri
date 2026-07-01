import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireOrgRole } from "@/lib/auth/guards";
import { listAgentsForDashboard } from "@/lib/agent/agents/queries";
import { AgentsTable } from "./agents-table";

export const metadata = { title: "Agentes IA" };

type Props = { params: Promise<{ orgSlug: string }> };

export default async function AgentsListPage({ params }: Props) {
  const { orgSlug } = await params;
  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });
  const agents = await listAgentsForDashboard(org.id);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="label-mono">/ agentes</span>
          <h1 className="font-semibold text-3xl tracking-tight">Agentes IA</h1>
          <p className="text-muted-foreground text-sm">
            Cada agente tem persona, base de conhecimento e cota próprios. Conecte agentes a canais
            específicos pra dividir atendimento por tema (vendas, suporte, etc.).
          </p>
        </div>
        <Button render={<Link href={`/app/${orgSlug}/settings/agents/new`} />} nativeButton={false}>
          <PlusIcon className="h-4 w-4" />
          Novo agente
        </Button>
      </div>

      <AgentsTable orgSlug={orgSlug} agents={agents} />
    </div>
  );
}
