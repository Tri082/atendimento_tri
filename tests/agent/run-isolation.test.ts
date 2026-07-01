// Integration test — depende de Supabase real E LLM real.
// Auto-skip se SUPABASE_SERVICE_ROLE_KEY ou ANTHROPIC_API_KEY não estão no env.
// Roda em prod-like com cleanup automático na org de teste.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HAS_SB = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const HAS_LLM = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);

describe.skipIf(!HAS_SB || !HAS_LLM)("runAgent isolation", () => {
  let orgId: string;
  let agentA: string;
  let agentB: string;
  let convId: string;
  let sb: import("@supabase/supabase-js").SupabaseClient;

  beforeAll(async () => {
    const { createServiceClient } = await import("@/lib/supabase/service");
    sb = createServiceClient();

    const slug = `test-run-iso-${Date.now()}`;
    const { data: org, error: orgErr } = await sb
      .from("organizations")
      .insert({ name: "test-run-iso", slug })
      .select("id")
      .single();
    if (orgErr) throw orgErr;
    orgId = org!.id;

    const { data: a } = await sb
      .from("agents")
      .insert({ organization_id: orgId, name: "Agente A", persona: "PERSONA_A_MARKER", tone: "formal" })
      .select("id")
      .single();
    agentA = a!.id;

    const { data: b } = await sb
      .from("agents")
      .insert({ organization_id: orgId, name: "Agente B", persona: "PERSONA_B_MARKER", tone: "amigavel" })
      .select("id")
      .single();
    agentB = b!.id;

    const { data: ch } = await sb
      .from("channels")
      .insert({ organization_id: orgId, type: "mock", name: "Mock", config: {}, agent_id: agentA })
      .select("id")
      .single();

    const { data: conv } = await sb
      .from("conversations")
      .insert({
        organization_id: orgId,
        channel_id: ch!.id,
        external_thread_id: `+5511999${Date.now()}`,
        status: "open",
        agent_status: "idle",
      })
      .select("id")
      .single();
    convId = conv!.id;

    await sb.from("messages").insert({
      organization_id: orgId,
      conversation_id: convId,
      direction: "inbound",
      sender_kind: "contact",
      body: "Oi, teste",
      status: "delivered",
    });
  }, 30_000);

  afterAll(async () => {
    if (orgId) await sb.from("organizations").delete().eq("id", orgId);
  });

  it("registra agent_run com agent_id correto", async () => {
    const { runAgent } = await import("@/lib/agent/run");
    await runAgent({ orgId, agentId: agentA, conversationId: convId });

    const { data: runs } = await sb
      .from("agent_runs")
      .select("agent_id, status")
      .eq("conversation_id", convId)
      .order("started_at", { ascending: false })
      .limit(1);

    expect(runs?.[0]?.agent_id).toBe(agentA);
  }, 60_000);

  it("sai silenciosamente se agente está pausado (is_active=false)", async () => {
    const { runAgent } = await import("@/lib/agent/run");
    await sb.from("agents").update({ is_active: false }).eq("id", agentB);
    await sb.from("conversations").update({ agent_status: "idle" }).eq("id", convId);

    const before = await sb
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentB);

    await runAgent({ orgId, agentId: agentB, conversationId: convId });

    const after = await sb
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentB);

    expect(after.count).toBe(before.count);
  }, 30_000);
});
