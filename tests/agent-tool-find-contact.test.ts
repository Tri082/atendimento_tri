import { describe, expect, test, vi } from "vitest";
import { makeFindContactTool } from "@/lib/agent/tools/find-contact";

function makeMockSupabase(returnData: unknown[]) {
  const limit = vi.fn().mockReturnValue({ ilike: vi.fn().mockReturnThis() });
  const ilike = vi.fn().mockReturnThis();
  const builder: Record<string, unknown> = {
    limit,
    ilike,
  };
  // Final await: just resolve
  builder.then = (resolve: (v: unknown) => void) =>
    resolve({ data: returnData });
  const eq = vi.fn().mockReturnValue(builder);
  const select = vi.fn().mockReturnValue({ eq });
  return {
    from: vi.fn().mockReturnValue({ select }),
  } as never;
}

describe("find-contact tool", () => {
  test("retorna contatos vazios sem name nem email", async () => {
    const ctx = {
      orgId: "org",
      agentId: "agent",
      conversationId: "conv",
      contactId: null,
      supabase: makeMockSupabase([]),
    };
    const t = makeFindContactTool(ctx);
    const result = await (t.execute as (i: unknown) => Promise<unknown>)({});
    expect(result).toEqual({ contacts: [] });
  });
});
