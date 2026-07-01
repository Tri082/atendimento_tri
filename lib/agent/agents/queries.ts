import { createClient } from "@/lib/supabase/server";

export type Agent = {
  id: string;
  organization_id: string;
  name: string;
  company_name: string | null;
  persona: string | null;
  goal: string | null;
  tone: "formal" | "casual" | "amigavel";
  never_do: string | null;
  daily_token_cap: number;
  llm_provider: "anthropic" | "openai";
  llm_model: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function listAgents(orgId: string): Promise<Agent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  return (data ?? []) as Agent[];
}

export async function getAgent(orgId: string, agentId: string): Promise<Agent | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return (data ?? null) as Agent | null;
}

export type AgentListRow = Agent & {
  channels: Array<{ id: string; name: string }>;
  usage_today: { tokens: number; responses: number };
  last_run_at: string | null;
};

/** Lista enriquecida pra tela /settings/agents. */
export async function listAgentsForDashboard(orgId: string): Promise<AgentListRow[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: agentsData }, { data: channelsData }, { data: usageData }, { data: runsData }] =
    await Promise.all([
      supabase.from("agents").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("channels").select("id, name, agent_id").eq("organization_id", orgId),
      supabase
        .from("agent_usage_daily")
        .select("agent_id, tokens_used, responses")
        .eq("organization_id", orgId)
        .eq("day", today),
      supabase
        .from("agent_runs")
        .select("agent_id, started_at")
        .eq("organization_id", orgId)
        .order("started_at", { ascending: false })
        .limit(1000),
    ]);

  const agents = (agentsData ?? []) as Agent[];
  const channels = (channelsData ?? []) as Array<{ id: string; name: string; agent_id: string | null }>;
  const usageMap = new Map<string, { tokens: number; responses: number }>();
  for (const u of usageData ?? []) {
    usageMap.set(u.agent_id, { tokens: u.tokens_used, responses: u.responses });
  }
  const lastRunMap = new Map<string, string>();
  for (const r of runsData ?? []) {
    if (!lastRunMap.has(r.agent_id)) lastRunMap.set(r.agent_id, r.started_at);
  }

  return agents.map((a) => ({
    ...a,
    channels: channels
      .filter((c) => c.agent_id === a.id)
      .map((c) => ({ id: c.id, name: c.name })),
    usage_today: usageMap.get(a.id) ?? { tokens: 0, responses: 0 },
    last_run_at: lastRunMap.get(a.id) ?? null,
  }));
}
