"use client";

import { SparklesIcon } from "lucide-react";

interface Props {
  status: "idle" | "thinking" | "paused_handoff";
  agentName?: string | null;
}

// Estado vem da query de conversation no server. Quando o agente muda
// pra `thinking` ou volta pra `idle`, o router.refresh() do InboxShell
// (disparado pelo broadcast `messaging_broadcast` em `conversations`)
// re-renderiza a página e essa prop chega atualizada.
export function AgentStatusIndicator({ status, agentName }: Props) {
  if (status !== "thinking") return null;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-1.5 text-xs text-muted-foreground">
      <SparklesIcon className="h-3 w-3 animate-pulse text-primary" />
      <span>{agentName ? `${agentName} está pensando…` : "Agente está pensando…"}</span>
    </div>
  );
}
