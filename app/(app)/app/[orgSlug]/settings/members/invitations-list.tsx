"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revokeInvitationAction } from "@/lib/invitations/actions";
import type { Invitation } from "@/lib/orgs/queries";

export function InvitationsList({
  orgSlug,
  invitations,
}: {
  orgSlug: string;
  invitations: Invitation[];
}) {
  const [pending, startTransition] = useTransition();

  function handleRevoke(id: string) {
    startTransition(async () => {
      const result = await revokeInvitationAction(orgSlug, id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Convite cancelado");
    });
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/aceitar-convite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  return (
    <ul className="divide-y divide-border">
      {invitations.map((inv) => (
        <li key={inv.id} className="flex items-center gap-3 py-3">
          <div className="flex-1">
            <p className="font-medium text-sm">{inv.email}</p>
            <p className="text-muted-foreground text-xs">
              Convidado em {new Date(inv.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => copyLink(inv.token)}>
            Copiar link
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => handleRevoke(inv.id)}>
            Cancelar
          </Button>
        </li>
      ))}
    </ul>
  );
}
