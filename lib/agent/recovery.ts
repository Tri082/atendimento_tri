import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Reseta conversas com agent_status='thinking' há > 5min pra 'idle'.
 * Provavelmente o processo morreu antes do trigger completar.
 */
export async function recoverStaleAgents(): Promise<{ reset: number }> {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const { data, error } = await supabase
    .from("conversations")
    .update({ agent_status: "idle", agent_thinking_started_at: null })
    .eq("agent_status", "thinking")
    .lt("agent_thinking_started_at", cutoff)
    .select("id, organization_id");
  if (error) {
    logError("agent.recovery", error);
    return { reset: 0 };
  }

  // Cria task pro humano em cada conv resetada
  for (const conv of data ?? []) {
    await supabase.from("tasks").insert({
      organization_id: conv.organization_id,
      title: "Investigar agente travado",
      description: `Conversa ${conv.id} ficou em 'thinking' > 5min. Pode indicar bug ou pico de uso.`,
      priority: "high",
      status: "pending",
    });
  }

  return { reset: data?.length ?? 0 };
}
