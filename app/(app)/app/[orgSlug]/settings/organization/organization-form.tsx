"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { updateOrganizationAction } from "@/lib/orgs/actions";

const schema = z.object({
  name: z.string().min(2).max(80),
  newSlug: z.string().min(3).max(40),
});
type FormValues = z.infer<typeof schema>;

export function OrganizationForm({
  orgSlug,
  defaultValues,
}: {
  orgSlug: string;
  defaultValues: FormValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateOrganizationAction({ orgSlug, ...values });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Workspace atualizado");
      if (result.slug !== orgSlug) {
        router.push(`/app/${result.slug}/settings/organization`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
        <TextField name="name" control={form.control} label="Nome do workspace" />
        <TextField
          name="newSlug"
          control={form.control}
          label="Endereço (slug)"
          description="Mudar isso altera a URL do seu workspace."
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </FormProvider>
  );
}
