"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { updatePasswordAction } from "@/lib/auth/actions";
import { type UpdatePasswordInput, updatePasswordSchema } from "@/lib/auth/schemas";

export function UpdateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(values: UpdatePasswordInput) {
    startTransition(async () => {
      const result = await updatePasswordAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Senha atualizada!");
      router.push("/onboarding");
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField
          name="password"
          control={form.control}
          label="Nova senha"
          inputProps={{ type: "password", autoComplete: "new-password" }}
        />
        <TextField
          name="confirmPassword"
          control={form.control}
          label="Confirmar nova senha"
          inputProps={{ type: "password", autoComplete: "new-password" }}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Salvando..." : "Atualizar senha"}
        </Button>
      </form>
    </FormProvider>
  );
}
