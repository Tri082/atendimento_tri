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
import { deleteCompanyAction, updateCompanyAction } from "@/lib/companies/actions";

const formSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(200),
});
type FormValues = z.infer<typeof formSchema>;

type Props = {
  orgSlug: string;
  canDelete: boolean;
  company: { id: string; name: string };
};

export function CompanyForm({ orgSlug, canDelete, company }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: company.name },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const r = await updateCompanyAction({
        orgSlug,
        id: company.id,
        name: values.name,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Empresa atualizada");
    });
  }

  function handleDelete() {
    if (
      !confirm(
        "Apagar essa empresa? Vai apagar também todos os deals dela. Essa ação não pode ser desfeita.",
      )
    )
      return;
    startDelete(async () => {
      const r = await deleteCompanyAction({ orgSlug, id: company.id });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Empresa apagada");
      router.push(`/app/${orgSlug}/empresas`);
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField name="name" control={form.control} label="Nome" />

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
