import { createClient } from "@/lib/supabase/server";

export async function getUsageToday(agentId: string): Promise<{ tokens: number; responses: number }> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("agent_usage_daily")
    .select("tokens_used, responses")
    .eq("agent_id", agentId)
    .eq("day", today)
    .maybeSingle();
  return {
    tokens: data?.tokens_used ?? 0,
    responses: data?.responses ?? 0,
  };
}
