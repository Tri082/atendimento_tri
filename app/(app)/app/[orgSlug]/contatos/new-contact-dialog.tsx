"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CompanyCombobox, type CompanyOption } from "@/components/forms/company-combobox";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createContactAction } from "@/lib/contacts/actions";
import { type CreateContactInput, createContactSchema } from "@/lib/contacts/schemas";

type Props = { orgSlug: string; companies: CompanyOption[] };

export function NewContactDialog({ orgSlug, companies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      orgSlug,
      name: "",
      email: "",
      phone: "",
      title: "",
      companyId: null,
    },
  });

  function onSubmit(values: CreateContactInput) {
    startTransition(async () => {
      const r = await createContactAction(values);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Contato criado");
      form.reset({
        orgSlug,
        name: "",
        email: "",
        phone: "",
        title: "",
        companyId: null,
      });
      setOpen(false);
      if (r.data?.id) {
        router.push(`/app/${orgSlug}/contatos/${r.data.id}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="h-3.5 w-3.5" />
            Novo contato
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo contato</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TextField
              name="name"
              control={form.control}
              label="Nome"
              inputProps={{ placeholder: "Ex: João Silva" }}
            />
            <TextField
              name="title"
              control={form.control}
              label="Cargo"
              description="Opcional"
              inputProps={{ placeholder: "Ex: CFO" }}
            />
            <div className="space-y-1.5">
              <label className="font-medium text-sm">Empresa</label>
              <Controller
                name="companyId"
                control={form.control}
                render={({ field }) => (
                  <CompanyCombobox
                    options={companies}
                    value={field.value ?? null}
                    onChange={field.onChange}
                    placeholder="Sem empresa (contato solto)"
                  />
                )}
              />
            </div>
            <TextField
              name="phone"
              control={form.control}
              label="Telefone"
              description="Opcional"
              inputProps={{ placeholder: "(11) 99999-9999" }}
            />
            <TextField
              name="email"
              control={form.control}
              label="E-mail"
              description="Opcional"
              inputProps={{ type: "email", placeholder: "joao@exemplo.com" }}
            />
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Criando..." : "Criar contato"}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
