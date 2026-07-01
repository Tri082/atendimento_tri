"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTaskAction } from "@/lib/tasks/actions";
import { type CreateTaskInput, createTaskSchema } from "@/lib/tasks/schemas";

export function NewTaskDialog({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      orgSlug,
      title: "",
      description: "",
      priority: "medium",
      dueDate: null,
    },
  });

  function onSubmit(values: CreateTaskInput) {
    startTransition(async () => {
      const result = await createTaskAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tarefa criada");
      form.reset({
        orgSlug,
        title: "",
        description: "",
        priority: "medium",
        dueDate: null,
      });
      setOpen(false);
      if (result.data?.id) {
        router.push(`/app/${orgSlug}/tarefas/${result.data.id}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="h-3.5 w-3.5" />
            Nova tarefa
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TextField
              name="title"
              control={form.control}
              label="Título"
              inputProps={{ placeholder: "Ex: Ligar pro cliente X" }}
            />
            <TextField
              name="description"
              control={form.control}
              label="Descrição"
              description="Opcional"
            />
            <TextField
              name="dueDate"
              control={form.control}
              label="Vencimento"
              description="Formato: AAAA-MM-DD (opcional)"
              inputProps={{ type: "date" }}
            />
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Criando..." : "Criar tarefa"}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
