import { createClient } from "@/lib/supabase/server";

export async function listAutomations(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("automations")
    .select("id, name, description, trigger_type, status, created_at, updated_at")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getAutomation(orgId: string, automationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return data;
}

export async function listRecentRuns(orgId: string, automationId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("automation_runs")
    .select("id, status, started_at, finished_at, error, created_at, trigger_event_id")
    .eq("organization_id", orgId)
    .eq("automation_id", automationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRunWithSteps(orgId: string, runId: string) {
  const supabase = await createClient();
  const { data: run } = await supabase
    .from("automation_runs")
    .select("*")
    .eq("id", runId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!run) return null;
  const { data: steps } = await supabase
    .from("automation_run_steps")
    .select("*")
    .eq("run_id", runId)
    .order("step_index", { ascending: true });
  return { run, steps: steps ?? [] };
}

export async function getAutomationMetrics(orgId: string, automationId: string) {
  const supabase = await createClient();
  const sinceIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: rows } = await supabase
    .from("automation_runs")
    .select("status, created_at")
    .eq("organization_id", orgId)
    .eq("automation_id", automationId)
    .gte("created_at", sinceIso)
    // Sub-H Round-2 #1: ORDER BY pra lastRun ser de fato o último (rows[0] sem order era random).
    .order("created_at", { ascending: false });
  const total = rows?.length ?? 0;
  const completed = rows?.filter((r) => r.status === "completed").length ?? 0;
  const lastRun = rows && rows.length > 0 ? rows[0]?.created_at ?? null : null;
  return {
    total7d: total,
    successRate: total ? Math.round((completed / total) * 100) : 0,
    lastRun,
  };
}
