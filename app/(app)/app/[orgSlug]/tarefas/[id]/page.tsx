import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgMember } from "@/lib/auth/guards";
import { getTask } from "@/lib/tasks/queries";
import { TaskDetailForm } from "./task-detail-form";

type Props = { params: Promise<{ orgSlug: string; id: string }> };

export const metadata = { title: "Tarefa" };

export default async function TaskDetailPage({ params }: Props) {
  const { orgSlug, id } = await params;
  const { org, role } = await requireOrgMember({ orgSlug });
  const task = await getTask(org.id, id);

  if (!task) notFound();

  const canDelete = role === "owner" || role === "admin";

  return (
    <div className="max-w-3xl space-y-8">
      <Button
        render={<Link href={`/app/${orgSlug}/tarefas`} />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Voltar pra tarefas
      </Button>

      <div className="space-y-1.5">
        <span className="label-mono">/ tarefa #{task.id.slice(0, 8)}</span>
        <h1 className="font-semibold text-3xl tracking-tight">{task.title}</h1>
        <p className="font-mono text-muted-foreground text-xs">
          criada em{" "}
          {new Date(task.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ detalhes</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <TaskDetailForm
            orgSlug={orgSlug}
            canDelete={canDelete}
            task={{
              id: task.id,
              title: task.title,
              description: task.description ?? "",
              status: task.status,
              priority: task.priority,
              dueDate: task.due_date,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
