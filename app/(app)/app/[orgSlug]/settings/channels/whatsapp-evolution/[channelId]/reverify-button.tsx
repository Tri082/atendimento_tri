"use client";

import { RefreshCwIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reverifyEvolutionChannelAction } from "@/lib/messaging/adapters/whatsapp-evolution/actions";

export function ReverifyButton({ orgSlug, channelId }: { orgSlug: string; channelId: string }) {
  const [pending, start] = useTransition();
  function onClick() {
    start(async () => {
      const r = await reverifyEvolutionChannelAction({ orgSlug, channelId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Conexão revalidada e webhook reconfigurado.");
    });
  }
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={onClick}>
      <RefreshCwIcon className="mr-2 h-3.5 w-3.5" />
      {pending ? "Verificando…" : "Reverificar conexão"}
    </Button>
  );
}
