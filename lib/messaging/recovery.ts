import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

const STALE_THRESHOLD_MS = 60 * 1000;

/**
 * Marca como 'failed' mensagens em 'sending' há > 60s.
 * Provavelmente o processo morreu antes do `after()` completar.
 */
export async function recoverStaleMessages(): Promise<{ updated: number }> {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const { data, error } = await supabase
    .from("messages")
    .update({
      status: "failed",
      failure_reason: "Timeout: processo travou antes de confirmar envio.",
    })
    .eq("status", "sending")
    .lt("created_at", cutoff)
    .select("id");
  if (error) {
    logError("messaging.recovery", error);
    return { updated: 0 };
  }
  return { updated: data?.length ?? 0 };
}
