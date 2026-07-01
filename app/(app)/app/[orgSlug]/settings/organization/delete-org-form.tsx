"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteOrganizationAction } from "@/lib/orgs/actions";

type Props = {
  orgSlug: string;
};

/**
 * M-10: UI para delete da organização com confirmação por digitação do slug.
 * Owner-only. Bloqueia se a digitação não bater.
 */
export function DeleteOrgForm({ orgSlug }: Props) {
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (confirm !== orgSlug) {
      toast.error("Digite o slug exato para confirmar");
      return;
    }
    startTransition(async () => {
      const result = await deleteOrganizationAction({
        orgSlug,
        confirmSlug: confirm,
      });
      // Sucesso redireciona via server. Se chegou aqui, deu erro.
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <p>
        Essa ação apaga o workspace, todos os membros, convites e tarefas. Não tem como desfazer.
        Digite{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{orgSlug}</code>{" "}
        abaixo para confirmar.
      </p>
      <Input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={orgSlug}
        disabled={pending}
      />
      <Button variant="destructive" onClick={onClick} disabled={pending || confirm !== orgSlug}>
        {pending ? "Excluindo..." : "Excluir workspace permanentemente"}
      </Button>
    </div>
  );
}
