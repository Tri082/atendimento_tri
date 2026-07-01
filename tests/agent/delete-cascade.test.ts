// Integration test — depende de Supabase real (sem LLM).
// Auto-skip se SUPABASE_SERVICE_ROLE_KEY não está no env.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HAS_SB = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!HAS_SB)("delete agent cascades", () => {
  let orgId: string;
  let agentId: string;
  let channelId: string;
  let sb: import("@supabase/supabase-js").SupabaseClient;

  beforeAll(async () => {
    const { createServiceClient } = await import("@/lib/supabase/service");
    sb = createServiceClient();

    const { data: org } = await sb
      .from("organizations")
      .insert({ name: "test-del", slug: `test-del-${Date.now()}` })
      .select("id")
      .single();
    orgId = org!.id;

    const { data: a } = await sb
      .from("agents")
      .insert({ organization_id: orgId, name: "Vai morrer" })
      .select("id")
      .single();
    agentId = a!.id;

    const { data: ch } = await sb
      .from("channels")
      .insert({ organization_id: orgId, type: "mock", name: "C", config: {}, agent_id: agentId })
      .select("id")
      .single();
    channelId = ch!.id;

    await sb.from("agent_faq_items").insert({
      organization_id: orgId,
      agent_id: agentId,
      question: "q",
      answer: "a",
    });
  });

  afterAll(async () => {
    if (orgId) await sb.from("organizations").delete().eq("id", orgId);
  });

  it("delete agent apaga FAQs (CASCADE) e seta channels.agent_id como NULL", async () => {
    await sb.from("agents").delete().eq("id", agentId);

    const { count: faqCount } = await sb
      .from("agent_faq_items")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId);
    expect(faqCount).toBe(0);

    const { data: ch } = await sb.from("channels").select("agent_id").eq("id", channelId).single();
    expect(ch?.agent_id).toBeNull();
  });
});
