"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CompanyCombobox, type CompanyOption } from "@/components/forms/company-combobox";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { deleteContactAction, updateContactAction } from "@/lib/contacts/actions";

const formSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(120),
  email: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  title: z.string().max(120).optional(),
  companyId: z.string().nullable(),
});
type FormValues = z.infer<typeof formSchema>;

type Props = {
  orgSlug: string;
  canDelete: boolean;
  companies: CompanyOption[];
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    companyId: string | null;
  };
};

export function ContactForm({ orgSlug, canDelete, companies, contact }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      title: contact.title ?? "",
      companyId: contact.companyId,
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const r = await updateContactAction({
        orgSlug,
        id: contact.id,
        name: values.name,
        email: values.email,
        phone: values.phone,
        title: values.title,
        companyId: values.companyId,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Contato atualizado");
    });
  }

  function handleDelete() {
    if (!confirm("Apagar esse contato? Essa ação não pode ser desfeita.")) return;
    startDelete(async () => {
      const r = await deleteContactAction({ orgSlug, id: contact.id });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Contato apagado");
      router.push(`/app/${orgSlug}/contatos`);
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField name="name" control={form.control} label="Nome" />
        <TextField name="title" control={form.control} label="Cargo" description="Opcional" />
        <div className="space-y-1.5">
          <label className="font-medium text-sm">Empresa</label>
          <Controller
            name="companyId"
            control={form.control}
            render={({ field }) => (
              <CompanyCombobox
                options={companies}
                value={field.value}
                onChange={field.onChange}
                placeholder="Sem empresa (contato solto)"
              />
            )}
          />
        </div>
        <TextField name="phone" control={form.control} label="Telefone" description="Opcional" />
        <TextField
          name="email"
          control={form.control}
          label="E-mail"
          description="Opcional"
          inputProps={{ type: "email" }}
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
              {deleting ? "Apagando..." : "Apagar"}
            </Button>
          ) : (
            <div />
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
