import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { AUTOMATION_LIMITS } from "./limits";

/**
 * Marca steps em 'running' há > STEP_RECOVERY_CUTOFF_MS como 'failed'.
 * Em cascata, marca run pai como 'failed'.
 * Recovery a nível de step — não derruba runs longas multi-step.
 */
export async function recoverStaleAutomationSteps(): Promise<{
  recovered: number;
}> {
  const supabase = createServiceClient();
  const cutoff = new Date(
    Date.now() - AUTOMATION_LIMITS.STEP_RECOVERY_CUTOFF_MS,
  ).toISOString();

  const { data: stuckSteps, error } = await supabase
    .from("automation_run_steps")
    .select("id, run_id")
    .eq("status", "running")
    .lt("started_at", cutoff);

  if (error) {
    logError("automations.recovery.steps", error);
    return { recovered: 0 };
  }
  if (!stuckSteps || stuckSteps.length === 0) return { recovered: 0 };

  const now = new Date().toISOString();
  const stepIds = stuckSteps.map((s) => s.id);
  const runIds = Array.from(new Set(stuckSteps.map((s) => s.run_id)));

  await supabase
    .from("automation_run_steps")
    .update({
      status: "failed",
      error: "timeout (worker likely died)",
      finished_at: now,
    })
    .in("id", stepIds)
    .eq("status", "running"); // Sub-H H-7: race guard contra engine que terminou nesse meio tempo

  await supabase
    .from("automation_runs")
    .update({
      status: "failed",
      error: "step timeout — worker likely died",
      finished_at: now,
    })
    .in("id", runIds)
    .eq("status", "running");

  return { recovered: stuckSteps.length };
}
