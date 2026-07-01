"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
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
import { toast } from "sonner";
import { disconnectWhatsappChannelAction } from "@/lib/messaging/adapters/whatsapp-cloud/actions";

export function DisconnectButton({
  orgSlug,
  channelId,
}: {
  orgSlug: string;
  channelId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function confirm() {
    setSubmitting(true);
    const r = await disconnectWhatsappChannelAction({ orgSlug, channelId });
    setSubmitting(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Canal removido.");
    setOpen(false);
    router.push(`/app/${orgSlug}/settings/channels`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        <Trash2Icon className="mr-2 h-4 w-4" />
        Desconectar canal
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desconectar canal?</DialogTitle>
          <DialogDescription>
            Isso vai remover o canal e todas as conversas/mensagens associadas. Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={confirm} disabled={submitting}>
            {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Sim, desconectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
