import { DemoBanner } from "@/components/app/demo-banner";
import { requireOrgMember } from "@/lib/auth/guards";
import { getOrgTasks } from "@/lib/tasks/queries";
import { NewTaskDialog } from "./new-task-dialog";
import { TasksTable } from "./tasks-table";

type Props = { params: Promise<{ orgSlug: string }> };

export const metadata = { title: "Tarefas" };

export default async function TasksPage({ params }: Props) {
  const { orgSlug } = await params;
  const { org } = await requireOrgMember({ orgSlug });
  const tasks = await getOrgTasks(org.id);

  return (
    <div className="space-y-8">
      <DemoBanner>
        Exemplo de CRUD completo (criar, listar, editar, excluir) com RLS por workspace. Use como
        ponto de partida pra suas próprias funcionalidades.
      </DemoBanner>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="label-mono">/ tarefas</span>
          <h1 className="font-semibold text-3xl tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground text-sm">
            Organize o que precisa ser feito no workspace.
          </p>
        </div>
        <NewTaskDialog orgSlug={orgSlug} />
      </div>

      <TasksTable orgSlug={orgSlug} tasks={tasks} />
    </div>
  );
}
