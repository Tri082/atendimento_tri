"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
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

type Props = { orgSlug: string; dealId: string; companyId: string | null };

export function NewDealTaskDialog({ orgSlug, dealId, companyId }: Props) {
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
      dealId,
      companyId: companyId ?? undefined,
    },
  });

  function onSubmit(values: CreateTaskInput) {
    startTransition(async () => {
      const r = await createTaskAction({
        ...values,
        dealId,
        companyId: companyId ?? undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Tarefa criada");
      form.reset({
        orgSlug,
        title: "",
        description: "",
        priority: "medium",
        dueDate: null,
        dealId,
        companyId: companyId ?? undefined,
      });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5">
            <PlusIcon className="h-3.5 w-3.5" />
            Nova tarefa
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa pra esse deal</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TextField
              name="title"
              control={form.control}
              label="Título"
              inputProps={{ placeholder: "Ex: Mandar proposta amanhã" }}
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
