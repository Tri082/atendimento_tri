// Integration test — depende de Supabase real (sem LLM).
// Auto-skip se SUPABASE_SERVICE_ROLE_KEY não está no env.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HAS_SB = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!HAS_SB)("token cap isolation per agent", () => {
  let orgId: string;
  let agentA: string;
  let agentB: string;
  let sb: import("@supabase/supabase-js").SupabaseClient;

  beforeAll(async () => {
    const { createServiceClient } = await import("@/lib/supabase/service");
    sb = createServiceClient();

    const { data: org } = await sb
      .from("organizations")
      .insert({ name: "test-cap", slug: `test-cap-${Date.now()}` })
      .select("id")
      .single();
    orgId = org!.id;

    const { data: a } = await sb
      .from("agents")
      .insert({ organization_id: orgId, name: "A", daily_token_cap: 5000 })
      .select("id")
      .single();
    agentA = a!.id;

    const { data: b } = await sb
      .from("agents")
      .insert({ organization_id: orgId, name: "B", daily_token_cap: 5000 })
      .select("id")
      .single();
    agentB = b!.id;
  });

  afterAll(async () => {
    if (orgId) await sb.from("organizations").delete().eq("id", orgId);
  });

  it("agente A esgota cap próprio sem afetar agente B", async () => {
    const r1 = await sb.rpc("consume_agent_tokens", { _agent_id: agentA, _tokens: 4000 });
    expect(r1.data).toBe(true);

    const r2 = await sb.rpc("consume_agent_tokens", { _agent_id: agentA, _tokens: 1500 });
    expect(r2.data).toBe(false); // 5500 > 5000 → fora do cap

    const r3 = await sb.rpc("consume_agent_tokens", { _agent_id: agentB, _tokens: 1000 });
    expect(r3.data).toBe(true);
  });
});
