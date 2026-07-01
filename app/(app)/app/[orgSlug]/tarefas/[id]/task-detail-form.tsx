"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { deleteTaskAction, updateTaskAction } from "@/lib/tasks/actions";
import type { TaskPriority, TaskStatus } from "@/lib/tasks/queries";

const formSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(1000).nullable(),
  status: z.enum(["pending", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().nullable(),
});
type FormValues = z.infer<typeof formSchema>;

type Props = {
  orgSlug: string;
  canDelete: boolean;
  task: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
  };
};

export function TaskDetailForm({ orgSlug, canDelete, task }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateTaskAction({
        orgSlug,
        id: task.id,
        ...values,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tarefa atualizada");
    });
  }

  function handleDelete() {
    if (!confirm("Remover essa tarefa? Essa ação não pode ser desfeita.")) return;
    startDelete(async () => {
      const result = await deleteTaskAction({ orgSlug, id: task.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tarefa removida");
      router.push(`/app/${orgSlug}/tarefas`);
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <TextField name="title" control={form.control} label="Título" />
        <TextField name="description" control={form.control} label="Descrição" />
        <div className="grid grid-cols-2 gap-4">
          <StatusSelect
            label="Status"
            value={form.watch("status")}
            onChange={(v) => form.setValue("status", v)}
          />
          <PrioritySelect
            label="Prioridade"
            value={form.watch("priority")}
            onChange={(v) => form.setValue("priority", v)}
          />
        </div>
        <TextField
          name="dueDate"
          control={form.control}
          label="Vencimento"
          inputProps={{ type: "date" }}
        />

        <div className="flex items-center justify-between pt-2">
          {canDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
              {deleting ? "Removendo..." : "Remover"}
            </Button>
          ) : (
            <div />
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "pending", label: "A fazer" },
  { value: "in_progress", label: "Em progresso" },
  { value: "done", label: "Feito" },
];

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

function StatusSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TaskStatus;
  onChange: (v: TaskStatus) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="font-medium text-sm">{label}</label>
      <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-input p-1">
        {statusOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-sm px-2 py-1 text-xs transition-colors ${
              value === o.value
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PrioritySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TaskPriority;
  onChange: (v: TaskPriority) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="font-medium text-sm">{label}</label>
      <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-input p-1">
        {priorityOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-sm px-2 py-1 text-xs transition-colors ${
              value === o.value
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
