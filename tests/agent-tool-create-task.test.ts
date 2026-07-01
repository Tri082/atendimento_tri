import { describe, expect, test, vi } from "vitest";
import { makeCreateTaskTool } from "@/lib/agent/tools/create-task";

function makeSupabase(insertResult: { id: string } | null) {
  const single = vi
    .fn()
    .mockResolvedValue({ data: insertResult, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  return { from: vi.fn().mockReturnValue({ insert }) } as never;
}

describe("create-task tool", () => {
  test("retorna id após criar", async () => {
    const ctx = {
      orgId: "org",
      agentId: "agent",
      conversationId: "conv",
      contactId: "contact-123",
      supabase: makeSupabase({ id: "task-1" }),
    };
    const t = makeCreateTaskTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      title: "Ligar pro cliente",
      dueIn: "tomorrow",
      priority: "high",
    })) as { id: string; title: string };
    expect(result.id).toBe("task-1");
    expect(result.title).toBe("Ligar pro cliente");
  });
});
