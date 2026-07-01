"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { updateProfileAction } from "@/lib/profile/actions";
import { type UpdateProfileInput, updateProfileSchema } from "@/lib/profile/schemas";

type Props = { defaultValues: UpdateProfileInput };

export function ProfileForm({ defaultValues }: Props) {
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues,
  });

  function onSubmit(values: UpdateProfileInput) {
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Perfil atualizado");
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
        <TextField name="fullName" control={form.control} label="Nome completo" />
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </FormProvider>
  );
}
