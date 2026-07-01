import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { runAgent } from "./run";

const MAX_CONCURRENT = 10;
const DEBOUNCE_MS = 2000;

let inFlight = 0;
const queue: Array<() => void> = [];

export async function acquireSemaphore(): Promise<() => void> {
  if (inFlight >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  inFlight++;
  return () => {
    inFlight--;
    const next = queue.shift();
    if (next) next();
  };
}

export function _resetSemaphoreForTests() {
  inFlight = 0;
  queue.length = 0;
}

/**
 * Entry-point do agente. Lock + debounce + semáforo + runAgent.
 *
 * @param conversationId conversa que recebeu inbound
 * @param agentId agente designado pelo canal (channels.agent_id)
 */
export async function triggerAgent(conversationId: string, agentId: string): Promise<void> {
  const supabase = createServiceClient();

  // Lock conditional em conversations.agent_status
  const { data: locked } = await supabase
    .from("conversations")
    .update({ agent_status: "thinking", agent_thinking_started_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("agent_status", "idle")
    .select("id, organization_id")
    .maybeSingle();

  if (!locked) return;

  await new Promise((r) => setTimeout(r, DEBOUNCE_MS));

  const release = await acquireSemaphore();

  try {
    await runAgent({
      orgId: locked.organization_id,
      agentId,
      conversationId,
    });
  } catch (err) {
    logError("agent.trigger.run", err);
  } finally {
    release();
    await supabase
      .from("conversations")
      .update({ agent_status: "idle", agent_thinking_started_at: null })
      .eq("id", conversationId)
      .eq("agent_status", "thinking");
  }
}
