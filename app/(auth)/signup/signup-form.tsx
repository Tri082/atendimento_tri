"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { signUpAction } from "@/lib/auth/actions";
import { type SignUpFormInput, signUpFormSchema } from "@/lib/auth/schemas";

export function SignUpForm() {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<SignUpFormInput>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", fullName: "" },
  });

  function onSubmit(values: SignUpFormInput) {
    startTransition(async () => {
      const result = await signUpAction({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded-md border border-border bg-card p-4 text-center text-sm">
        <p className="font-medium">Confira seu email!</p>
        <p className="mt-1 text-muted-foreground">Enviamos um link de confirmação para você.</p>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField
          name="fullName"
          control={form.control}
          label="Seu nome"
          inputProps={{ autoComplete: "name" }}
        />
        <TextField
          name="email"
          control={form.control}
          label="Email"
          inputProps={{ type: "email", autoComplete: "email" }}
        />
        <TextField
          name="password"
          control={form.control}
          label="Senha"
          description="Mínimo 10 caracteres"
          inputProps={{ type: "password", autoComplete: "new-password" }}
        />
        <TextField
          name="confirmPassword"
          control={form.control}
          label="Confirmar senha"
          inputProps={{ type: "password", autoComplete: "new-password" }}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Criando..." : "Criar conta"}
        </Button>
        <p className="text-center text-muted-foreground text-sm">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </FormProvider>
  );
}
