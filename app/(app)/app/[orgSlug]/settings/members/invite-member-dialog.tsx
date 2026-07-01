"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createInvitationAction } from "@/lib/invitations/actions";
import { type CreateInvitationInput, createInvitationSchema } from "@/lib/invitations/schemas";

export function InviteMemberDialog({ orgSlug }: { orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { orgSlug, email: "", role: "member" },
  });

  function onSubmit(values: CreateInvitationInput) {
    startTransition(async () => {
      const result = await createInvitationAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.emailSent ? "Convite enviado!" : "Convite criado (email não enviado — copie o link)",
      );
      form.reset({ orgSlug, email: "", role: "member" });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Convidar</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TextField
              name="email"
              control={form.control}
              label="Email"
              inputProps={{ type: "email", placeholder: "pessoa@exemplo.com" }}
            />
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Enviando..." : "Enviar convite"}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
