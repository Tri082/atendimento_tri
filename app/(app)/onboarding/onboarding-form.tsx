"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { createOrganizationAction } from "@/lib/orgs/actions";
import { slugify } from "@/lib/orgs/slug";

const schema = z.object({
  name: z.string().min(2, "Nome muito curto").max(80),
  slug: z.string().min(3, "Mínimo 3 caracteres").max(40),
});
type FormValues = z.infer<typeof schema>;

export function OnboardingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  const nameValue = form.watch("name");
  useEffect(() => {
    const currentSlug = form.getValues("slug");
    if (!currentSlug || currentSlug === slugify(form.getValues("name").slice(0, -1))) {
      form.setValue("slug", slugify(nameValue));
    }
  }, [nameValue, form]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createOrganizationAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/app/${result.slug}/dashboard`);
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField
          name="name"
          control={form.control}
          label="Nome do workspace"
          description="Como vai chamar? (ex: Minha Empresa)"
        />
        <TextField
          name="slug"
          control={form.control}
          label="Endereço (slug)"
          description="Aparece na URL: /app/SLUG/dashboard"
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Criando..." : "Criar workspace"}
        </Button>
      </form>
    </FormProvider>
  );
}
