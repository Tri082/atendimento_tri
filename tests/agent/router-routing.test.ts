// Integration test — depende de Supabase real.
// Verifica que router lê channel.agent_id e dispatcha triggerAgent com agent certo.
// Auto-skip se SUPABASE_SERVICE_ROLE_KEY não está no env.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const HAS_SB = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!HAS_SB)("router dispatches correct agent", () => {
  let orgId: string;
  let agentId: string;
  let channelId: string;
  let sb: import("@supabase/supabase-js").SupabaseClient;

  beforeAll(async () => {
    const { createServiceClient } = await import("@/lib/supabase/service");
    sb = createServiceClient();

    const { data: org } = await sb
      .from("organizations")
      .insert({ name: "test-route", slug: `test-route-${Date.now()}` })
      .select("id")
      .single();
    orgId = org!.id;

    const { data: a } = await sb
      .from("agents")
      .insert({ organization_id: orgId, name: "Roteado" })
      .select("id")
      .single();
    agentId = a!.id;

    const { data: ch } = await sb
      .from("channels")
      .insert({ organization_id: orgId, type: "mock", name: "C", config: {}, agent_id: agentId })
      .select("id")
      .single();
    channelId = ch!.id;
  });

  afterAll(async () => {
    if (orgId) await sb.from("organizations").delete().eq("id", orgId);
  });

  it("processInboundMessage chama triggerAgent com o agent_id do canal", async () => {
    const triggerModule = await import("@/lib/agent/trigger");
    const spy = vi.spyOn(triggerModule, "triggerAgent").mockResolvedValue(undefined);

    const { processInboundMessage } = await import("@/lib/messaging/router");
    await processInboundMessage("mock", {
      kind: "message",
      externalThreadId: `+5511${Date.now()}`,
      externalMessageId: `test-route-${Date.now()}`,
      message: { body: "ping" },
      timestamp: new Date().toISOString(),
      raw: { channelId },
    } as Parameters<typeof processInboundMessage>[1]);

    // Aguarda o `after()` flush
    await new Promise((r) => setTimeout(r, 100));

    expect(spy).toHaveBeenCalled();
    const args = spy.mock.calls[0];
    expect(args?.[1]).toBe(agentId);
    spy.mockRestore();
  }, 30_000);
});
