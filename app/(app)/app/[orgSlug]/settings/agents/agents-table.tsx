"use client";

import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import type { AgentListRow } from "@/lib/agent/agents/queries";
import { getAgentColumns } from "./agent-columns";

type Props = {
  orgSlug: string;
  agents: AgentListRow[];
};

export function AgentsTable({ orgSlug, agents }: Props) {
  return (
    <DataTable
      columns={getAgentColumns(orgSlug)}
      data={agents}
      searchColumn="name"
      empty={
        <EmptyState
          title="Nenhum agente ainda"
          description="Crie seu primeiro agente IA pra começar a responder mensagens automaticamente."
        />
      }
    />
  );
}
