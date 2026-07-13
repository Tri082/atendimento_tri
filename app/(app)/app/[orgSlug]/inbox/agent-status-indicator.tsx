"use client";

import { ClockIcon, SparklesIcon } from "lucide-react";
import { formatRelative } from "@/lib/messaging/format/time";

interface Props {
  status: "idle" | "thinking" | "paused_handoff";
  agentName?: string | null;
  handoffRequestedAt?: string | null;
}

// Estado vem da query de conversation no server. Quando o agente muda
// pra `thinking` ou volta pra `idle`, o router.refresh() do InboxShell
// (disparado pelo broadcast `messaging_broadcast` em `conversations`)
// re-renderiza a página e essa prop chega atualizada.
export function AgentStatusIndicator({ status, agentName, handoffRequestedAt }: Props) {
  // handoffRequestedAt tem prioridade sobre o banner de "pensando": uma
  // conversa aguardando handoff é mais urgente que o agente processando.
  if (handoffRequestedAt) {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-amber-500/10 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-400">
        <ClockIcon className="h-3 w-3" />
        <span>
          Aguardando atendente há {formatRelative(handoffRequestedAt)} — clique em "Assumir" pra
          responder.
        </span>
      </div>
    );
  }

  if (status !== "thinking") return null;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-1.5 text-xs text-muted-foreground">
      <SparklesIcon className="h-3 w-3 animate-pulse text-primary" />
      <span>{agentName ? `${agentName} está pensando…` : "Agente está pensando…"}</span>
    </div>
  );
}
