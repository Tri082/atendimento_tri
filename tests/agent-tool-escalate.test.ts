import { describe, expect, test, vi } from "vitest";
import { makeEscalateTool } from "@/lib/agent/tools/escalate";

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => {
    fn();
  },
}));
vi.mock("@/lib/messaging/router", () => ({ processSendOutbound: vi.fn() }));

import { processSendOutbound } from "@/lib/messaging/router";

function makeSupabase() {
  const updateEq2 = vi.fn().mockResolvedValue({ error: null });
  const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 });
  const update = vi.fn().mockReturnValue({ eq: updateEq1 });
  const taskInsert = vi.fn().mockResolvedValue({ error: null });
  const messageInsert = vi.fn().mockReturnValue({
    select: () => ({
      single: async () => ({ data: { id: "msg-handoff-1" }, error: null }),
    }),
  });
  // Sub-H Round-2 #18: escalate busca conversations.channel(id, type) antes do emit.
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
      if (table === "tasks") return { insert: taskInsert };
      if (table === "messages") return { insert: messageInsert };
      return {};
    }),
    _spies: { update, taskInsert, messageInsert, select },
  } as never;
}

describe("escalate tool", () => {
  test("pausa conversa, seta handoff_requested_at, cria task urgente e retorna instruction", async () => {
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

    const spies = (
      supabase as unknown as {
        _spies: {
          update: ReturnType<typeof vi.fn>;
          taskInsert: ReturnType<typeof vi.fn>;
          messageInsert: ReturnType<typeof vi.fn>;
        };
      }
    )._spies;

    expect(spies.update).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_status: "paused_handoff",
        handoff_requested_at: expect.any(String),
      }),
    );
    expect(spies.taskInsert).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "high", status: "pending" }),
    );
  });

  test("manda mensagem automática ao cliente sem depender do LLM", async () => {
    const supabase = makeSupabase();
    const ctx = {
      orgId: "org",
      agentId: "agent",
      conversationId: "conv-1",
      contactId: "contact-1",
      supabase,
    };
    const t = makeEscalateTool(ctx);
    await (t.execute as (i: unknown) => Promise<unknown>)({
      reason: "Cliente pediu humano",
    });

    const spies = (
      supabase as unknown as {
        _spies: { messageInsert: ReturnType<typeof vi.fn> };
      }
    )._spies;

    expect(spies.messageInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "outbound",
        sender_kind: "bot",
        status: "sending",
        body: expect.stringContaining("time"),
      }),
    );
    expect(processSendOutbound).toHaveBeenCalledWith("msg-handoff-1");
  });
});
