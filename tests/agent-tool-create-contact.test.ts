import { describe, expect, test, vi } from "vitest";
import { makeCreateContactTool } from "@/lib/agent/tools/create-contact";

function makeSupabase({
  existing,
  insertResult,
}: {
  existing?: { id: string; name: string } | null;
  insertResult?: { id: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing ?? null });
  const phoneEq = vi.fn().mockReturnValue({ maybeSingle });
  const orgEqContacts = vi.fn().mockReturnValue({ eq: phoneEq });
  const selectContacts = vi.fn().mockReturnValue({ eq: orgEqContacts });

  const single = vi.fn().mockResolvedValue({
    data: insertResult ?? null,
    error: insertResult ? null : new Error("insert fail"),
  });
  const selectAfterInsert = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select: selectAfterInsert });

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  const from = vi.fn((table: string) => {
    if (table === "contacts") {
      // Diferencia select() vs insert()
      return { select: selectContacts, insert };
    }
    if (table === "conversations") {
      return { update };
    }
    return {};
  });

  return { from } as never;
}

describe("create-contact tool", () => {
  test("retorna existente quando phone já cadastrado (idempotente)", async () => {
    const ctx = {
      orgId: "org",
      agentId: "agent",
      conversationId: "conv",
      contactId: null,
      supabase: makeSupabase({ existing: { id: "existing-id", name: "João" } }),
    };
    const t = makeCreateContactTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      name: "João Silva",
      phone: "+5511999998888",
    })) as { id: string; created: boolean; name: string };
    expect(result.created).toBe(false);
    expect(result.id).toBe("existing-id");
  });

  test("cria novo quando phone não existe", async () => {
    const ctx = {
      orgId: "org",
      agentId: "agent",
      conversationId: "conv",
      contactId: null,
      supabase: makeSupabase({
        existing: null,
        insertResult: { id: "new-id" },
      }),
    };
    const t = makeCreateContactTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      name: "Maria Costa",
      phone: "+5511999990000",
    })) as { id: string; created: boolean };
    expect(result.created).toBe(true);
    expect(result.id).toBe("new-id");
  });
});
