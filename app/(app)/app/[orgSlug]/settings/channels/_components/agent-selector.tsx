"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setChannelAgentAction } from "@/lib/agent/agents/actions";

type AgentOption = { id: string; name: string; is_active: boolean };

export function AgentSelector({
  orgSlug,
  channelId,
  currentAgentId,
  agents,
}: {
  orgSlug: string;
  channelId: string;
  currentAgentId: string | null;
  agents: AgentOption[];
}) {
  const [value, setValue] = useState<string>(currentAgentId ?? "__none__");
  const [pending, start] = useTransition();

  function onChange(next: string) {
    setValue(next);
    const agentId = next === "__none__" ? null : next;
    start(async () => {
      const r = await setChannelAgentAction({ orgSlug, channelId, agentId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(agentId ? "Agente conectado ao canal." : "Agente desconectado do canal.");
    });
  }

  const active = agents.filter((a) => a.is_active);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Agente responsável por este canal</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        className="w-72 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="__none__">— Nenhum (desligado) —</option>
        {active.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {active.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum agente ativo na org. Crie ou ative um em <strong>Agentes IA</strong>.
        </p>
      )}
    </div>
  );
}
