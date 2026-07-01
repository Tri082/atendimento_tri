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
import { createCompanyAction } from "@/lib/companies/actions";
import { type CreateCompanyInput, createCompanySchema } from "@/lib/companies/schemas";

export function NewCompanyDialog({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { orgSlug, name: "" },
  });

  function onSubmit(values: CreateCompanyInput) {
    startTransition(async () => {
      const result = await createCompanyAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Empresa criada");
      form.reset({ orgSlug, name: "" });
      setOpen(false);
      if (result.data?.id) {
        router.push(`/app/${orgSlug}/empresas/${result.data.id}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="h-3.5 w-3.5" />
            Nova empresa
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TextField
              name="name"
              control={form.control}
              label="Nome"
              inputProps={{ placeholder: "Ex: Acme S.A." }}
            />
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Criando..." : "Criar empresa"}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
