"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteAgentAction } from "@/lib/agent/agents/actions";

export function DeleteAgentDialog({
  orgSlug,
  agentId,
  agentName,
}: {
  orgSlug: string;
  agentId: string;
  agentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, start] = useTransition();

  function onDelete() {
    start(async () => {
      const r = await deleteAgentAction({ orgSlug, agentId, confirmationName: confirmation });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Agente apagado.");
      setOpen(false);
      router.push(`/app/${orgSlug}/settings/agents`);
    });
  }

  return (
    <div id="delete" className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-medium text-destructive">Apagar agente</h3>
          <p className="text-muted-foreground text-sm">
            Apaga permanentemente esse agente, sua base de conhecimento e o histórico de execuções.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="destructive">Apagar agente</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apagar &quot;{agentName}&quot;?</DialogTitle>
              <DialogDescription>
                Isso vai apagar permanentemente as FAQs, os documentos e o histórico desse agente.
                Os canais conectados voltam pra &quot;sem agente&quot;. Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm">
                Pra confirmar, digite o nome do agente: <strong>{agentName}</strong>
              </p>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={agentName}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={pending || confirmation !== agentName}
                onClick={onDelete}
              >
                {pending ? "Apagando…" : "Apagar permanentemente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
