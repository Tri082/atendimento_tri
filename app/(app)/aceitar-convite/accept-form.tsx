"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "@/lib/invitations/actions";

export function AcceptForm({ token, orgName }: { token: string; orgName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInvitationAction({ token });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Bem-vindo a ${orgName}!`);
      router.push(`/app/${result.orgSlug}/dashboard`);
    });
  }

  return (
    <Button onClick={handleAccept} disabled={pending} className="w-full">
      {pending ? "Aceitando..." : `Entrar em ${orgName}`}
    </Button>
  );
}
