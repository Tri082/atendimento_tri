"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { type ResetPasswordInput, resetPasswordSchema } from "@/lib/auth/schemas";

export function ResetForm() {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ResetPasswordInput) {
    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <p className="text-center text-muted-foreground text-sm">
        Se esse email existe, enviamos um link de recuperação.
      </p>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField
          name="email"
          control={form.control}
          label="Email"
          inputProps={{ type: "email", autoComplete: "email" }}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Enviando..." : "Enviar link de recuperação"}
        </Button>
      </form>
    </FormProvider>
  );
}
