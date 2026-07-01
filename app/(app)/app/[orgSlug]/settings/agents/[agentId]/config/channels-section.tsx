"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setChannelAgentAction } from "@/lib/agent/agents/actions";

type Channel = { id: string; name: string; type: string; agent_id: string | null };

export function ChannelsSection({
  orgSlug,
  agentId,
  channels,
}: {
  orgSlug: string;
  agentId: string;
  channels: Channel[];
}) {
  const [pending, start] = useTransition();
  const connected = channels.filter((c) => c.agent_id === agentId);

  function disconnect(channelId: string) {
    start(async () => {
      const r = await setChannelAgentAction({ orgSlug, channelId, agentId: null });
      if (!r.ok) toast.error(r.error);
      else toast.success("Canal desconectado.");
    });
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/60 bg-card/40 py-3">
        <CardTitle className="label-mono text-[10px]">/ canais conectados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        {connected.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum canal aponta pra esse agente. Vá em <strong>Canais</strong> pra conectar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {connected.map((c) => (
              <Badge key={c.id} variant="outline" className="gap-2 py-1.5">
                {c.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-destructive"
                  disabled={pending}
                  onClick={() => disconnect(c.id)}
                >
                  ×
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
