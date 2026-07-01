"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { signInAction } from "@/lib/auth/actions";
import { type SignInInput, signInSchema } from "@/lib/auth/schemas";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignInInput) {
    startTransition(async () => {
      const result = await signInAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/onboarding");
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField
          name="email"
          control={form.control}
          label="Email"
          inputProps={{ type: "email", autoComplete: "email", placeholder: "seu@email.com" }}
        />
        <TextField
          name="password"
          control={form.control}
          label="Senha"
          inputProps={{ type: "password", autoComplete: "current-password" }}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </Button>
        <div className="flex justify-between text-sm">
          <Link href="/signup" className="text-muted-foreground hover:text-primary">
            Criar conta
          </Link>
          <Link href="/reset-password" className="text-muted-foreground hover:text-primary">
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </FormProvider>
  );
}
