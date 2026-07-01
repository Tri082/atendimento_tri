"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { disconnectEvolutionChannelAction } from "@/lib/messaging/adapters/whatsapp-evolution/actions";

export function DisconnectButton({
  orgSlug,
  channelId,
}: {
  orgSlug: string;
  channelId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onClick() {
    if (!confirm("Desconectar este canal? A instância no Evolution NÃO será removida.")) return;
    start(async () => {
      const r = await disconnectEvolutionChannelAction({ orgSlug, channelId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Canal desconectado.");
      router.push(`/app/${orgSlug}/settings/channels`);
    });
  }
  return (
    <Button variant="destructive" disabled={pending} onClick={onClick}>
      <Trash2Icon className="mr-2 h-4 w-4" />
      {pending ? "Desconectando…" : "Desconectar canal"}
    </Button>
  );
}
