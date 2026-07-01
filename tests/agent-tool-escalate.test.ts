import { describe, expect, test, vi } from "vitest";
import { makeEscalateTool } from "@/lib/agent/tools/escalate";

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => {
    void fn;
  },
}));

function makeSupabase() {
  const updateEq2 = vi.fn().mockResolvedValue({ error: null });
  const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 });
  const update = vi.fn().mockReturnValue({ eq: updateEq1 });
  const insert = vi.fn().mockResolvedValue({ error: null });
  // Sub-H Round-2 #18: escalate agora busca conversations.channel(id, type)
  // antes do emit. Mock retorna channel mock.
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      channel_id: "channel-1",
      channel: { id: "channel-1", type: "whatsapp_cloud" },
    },
    error: null,
  });
  const selectEq2 = vi.fn().mockReturnValue({ maybeSingle });
  const selectEq1 = vi.fn().mockReturnValue({ eq: selectEq2 });
  const select = vi.fn().mockReturnValue({ eq: selectEq1 });
  return {
    from: vi.fn((table: string) => {
      if (table === "conversations") return { update, select };
      if (table === "tasks") return { insert };
      return {};
    }),
    _spies: { update, insert, select },
  } as never;
}

describe("escalate tool", () => {
  test("pausa conversa, cria task urgente e retorna instruction", async () => {
    const supabase = makeSupabase();
    const ctx = {
      orgId: "org",
      agentId: "agent",
      conversationId: "conv-1",
      contactId: "contact-1",
      supabase,
    };
    const t = makeEscalateTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      reason: "Cliente quer falar sobre devolução de produto fora da política",
    })) as { success: boolean; instruction: string };
    expect(result.success).toBe(true);
    expect(result.instruction).toContain("humano");
    expect(
      (
        supabase as {
          _spies: {
            update: ReturnType<typeof vi.fn>;
            insert: ReturnType<typeof vi.fn>;
          };
        }
      )._spies.update,
    ).toHaveBeenCalled();
    expect(
      (
        supabase as {
          _spies: {
            update: ReturnType<typeof vi.fn>;
            insert: ReturnType<typeof vi.fn>;
          };
        }
      )._spies.insert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "high", status: "pending" }),
    );
  });
});
