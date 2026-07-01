"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Task, TaskPriority, TaskStatus } from "@/lib/tasks/queries";

const statusLabel: Record<TaskStatus, string> = {
  pending: "A fazer",
  in_progress: "Em progresso",
  done: "Feito",
};

const statusStyle: Record<TaskStatus, string> = {
  pending: "border-border text-muted-foreground",
  in_progress: "border-chart-3/40 text-chart-3 bg-chart-3/10",
  done: "border-primary/40 text-primary bg-primary/10",
};

const priorityLabel: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const priorityStyle: Record<TaskPriority, string> = {
  low: "text-muted-foreground",
  medium: "text-foreground",
  high: "text-destructive",
};

export function getTaskColumns(orgSlug: string): ColumnDef<Task>[] {
  return [
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <Link
          href={`/app/${orgSlug}/tarefas/${row.original.id}`}
          className="group flex items-center gap-1.5 font-medium text-sm hover:text-primary"
        >
          <span className="truncate">{row.original.title}</span>
          <ArrowUpRightIcon className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={statusStyle[row.original.status]}>
          {statusLabel[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: "Prioridade",
      cell: ({ row }) => (
        <span
          className={`font-mono text-[11px] uppercase tracking-wider ${priorityStyle[row.original.priority]}`}
        >
          {priorityLabel[row.original.priority]}
        </span>
      ),
    },
    {
      accessorKey: "due_date",
      header: "Vencimento",
      cell: ({ row }) => {
        const d = row.original.due_date;
        return (
          <span className="font-mono text-muted-foreground text-xs">
            {d
              ? new Date(d).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })
              : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Criado",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-xs">
          {new Date(row.original.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </span>
      ),
    },
  ];
}
