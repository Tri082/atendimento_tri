"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AgentListRow } from "@/lib/agent/agents/queries";
import { AgentRowActions } from "./agent-row-actions";

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function getAgentColumns(orgSlug: string): ColumnDef<AgentListRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <Link
          href={`/app/${orgSlug}/settings/agents/${row.original.id}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge variant="default">Ativo</Badge>
        ) : (
          <Badge variant="secondary">Pausado</Badge>
        ),
    },
    {
      id: "channels",
      header: "Canais",
      cell: ({ row }) =>
        row.original.channels.length === 0 ? (
          <span className="text-muted-foreground text-sm">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.original.channels.map((c) => (
              <Badge key={c.id} variant="outline">
                {c.name}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      id: "usage",
      header: "Uso hoje",
      cell: ({ row }) => {
        const pct = Math.min(100, (row.original.usage_today.tokens / row.original.daily_token_cap) * 100);
        return (
          <div className="space-y-1">
            <div className="text-xs">
              {row.original.usage_today.tokens.toLocaleString("pt-BR")} /{" "}
              {row.original.daily_token_cap.toLocaleString("pt-BR")}
            </div>
            <div className="h-1 w-24 rounded-full bg-muted">
              <div className="h-1 rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      id: "last_run",
      header: "Última atividade",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{relativeTime(row.original.last_run_at)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <AgentRowActions orgSlug={orgSlug} agent={row.original} />,
    },
  ];
}
