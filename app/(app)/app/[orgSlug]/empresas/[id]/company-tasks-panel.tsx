import Link from "next/link";
import type { Database } from "@/types/supabase";
import { NewCompanyTaskDialog } from "./new-company-task-dialog";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "A fazer",
  in_progress: "Em progresso",
  done: "Feito",
};

type Props = { orgSlug: string; companyId: string; tasks: Task[] };

export function CompanyTasksPanel({ orgSlug, companyId, tasks }: Props) {
  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhuma tarefa vinculada a essa empresa ainda.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={`/app/${orgSlug}/tarefas/${task.id}`}
                  className="truncate font-medium text-sm hover:underline"
                >
                  {task.title}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {STATUS_LABEL[task.status]}
                  {task.due_date ? ` · vence ${task.due_date}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <NewCompanyTaskDialog orgSlug={orgSlug} companyId={companyId} />
    </div>
  );
}
