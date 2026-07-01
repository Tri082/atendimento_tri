"use client";

import { ListTodoIcon } from "lucide-react";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import type { Task } from "@/lib/tasks/queries";
import { getTaskColumns } from "./task-columns";

export function TasksTable({ orgSlug, tasks }: { orgSlug: string; tasks: Task[] }) {
  return (
    <DataTable
      columns={getTaskColumns(orgSlug)}
      data={tasks}
      searchColumn="title"
      searchPlaceholder="Buscar por título..."
      empty={
        <EmptyState
          icon={ListTodoIcon}
          title="Nenhuma tarefa ainda"
          description="Crie sua primeira tarefa clicando em 'Nova tarefa' acima."
        />
      }
    />
  );
}
