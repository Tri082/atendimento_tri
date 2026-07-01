import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { runAutomation } from "./engine";
import { AUTOMATION_LIMITS } from "./limits";

export async function processNextRuns(
  opts: { limit?: number } = {},
): Promise<{ processed: number }> {
  const limit = opts.limit ?? AUTOMATION_LIMITS.WORKER_BATCH_SIZE;
  const supabase = createServiceClient();

  const { data: candidates, error } = await supabase
    .from("automation_runs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    logError("automations.worker.read", error);
    return { processed: 0 };
  }

  let processed = 0;
  for (const c of candidates ?? []) {
    // Lock condicional: UPDATE só se ainda for pending
    const { data: locked } = await supabase
      .from("automation_runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", c.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!locked) continue; // outro worker pegou
    try {
      await runAutomation(locked.id);
    } catch (err) {
      logError("automations.worker.run", err);
    }
    processed += 1;
  }
  return { processed };
}

export function startAutomationWorker(): NodeJS.Timeout {
  return setInterval(() => {
    processNextRuns().catch((err) => logError("automations.worker.tick", err));
  }, AUTOMATION_LIMITS.WORKER_INTERVAL_MS);
}
