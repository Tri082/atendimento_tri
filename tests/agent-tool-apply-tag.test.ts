import { describe, expect, test, vi } from "vitest";
import { makeApplyTagToConversationTool } from "@/lib/agent/tools/apply-tag-to-conversation";

type ExistingTag = { id: string; applies_to: string[] } | null;
type Cfg = {
  existingTag: ExistingTag;
  linkError?: Error | null;
  rpcError?: Error | null;
};

function makeSupabase(cfg: Cfg) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: cfg.existingTag, error: null });
  const ilikeTags = vi.fn().mockReturnValue({ maybeSingle });
  const orgEqTags = vi.fn().mockReturnValue({ ilike: ilikeTags });
  const selectTags = vi.fn().mockReturnValue({ eq: orgEqTags });

  const upsertLinks = vi
    .fn()
    .mockResolvedValue({ error: cfg.linkError ?? null });

  const from = vi.fn((table: string) => {
    if (table === "tags") return { select: selectTags };
    if (table === "conversation_tag_links") return { upsert: upsertLinks };
    return {};
  });

  const rpc = vi.fn().mockResolvedValue({ error: cfg.rpcError ?? null });

  return { from, rpc } as never;
}

const baseCtx = {
  orgId: "org-1",
  agentId: "agent-1",
  conversationId: "conv-1",
  contactId: null,
};

describe("apply-tag-to-conversation tool", () => {
  test("aplica direto quando tag existe com escopo de conversa", async () => {
    const ctx = {
      ...baseCtx,
      supabase: makeSupabase({
        existingTag: {
          id: "tag-1",
          applies_to: ["conversation", "contact"],
        },
      }),
    };
    const t = makeApplyTagToConversationTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      tag_name: "VIP",
    })) as { applied?: boolean; tag_id?: string; name?: string };
    expect(result.applied).toBe(true);
    expect(result.tag_id).toBe("tag-1");
    expect(result.name).toBe("VIP");
  });

  test("vira sugestão quando tag existe mas SEM escopo de conversa", async () => {
    const ctx = {
      ...baseCtx,
      supabase: makeSupabase({
        existingTag: {
          id: "tag-2",
          applies_to: ["contact", "deal"],
        },
      }),
    };
    const t = makeApplyTagToConversationTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      tag_name: "Comprou X",
    })) as { suggested?: boolean; name?: string; reason?: string };
    expect(result.suggested).toBe(true);
    expect(result.name).toBe("Comprou X");
    expect(result.reason).toContain("escopo");
  });

  test("vira sugestão quando tag NÃO existe no catálogo", async () => {
    const ctx = {
      ...baseCtx,
      supabase: makeSupabase({ existingTag: null }),
    };
    const t = makeApplyTagToConversationTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      tag_name: "Nova tag inédita",
    })) as { suggested?: boolean; reason?: string };
    expect(result.suggested).toBe(true);
    expect(result.reason).toContain("não existe");
  });

  test("retorna error quando upsert do link falha", async () => {
    const ctx = {
      ...baseCtx,
      supabase: makeSupabase({
        existingTag: { id: "tag-1", applies_to: ["conversation"] },
        linkError: new Error("RLS denied"),
      }),
    };
    const t = makeApplyTagToConversationTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      tag_name: "VIP",
    })) as { error?: string };
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("RLS"); // não vaza erro interno
  });

  test("retorna error quando RPC tag_suggestion_upsert falha", async () => {
    const ctx = {
      ...baseCtx,
      supabase: makeSupabase({
        existingTag: null,
        rpcError: new Error("permission denied"),
      }),
    };
    const t = makeApplyTagToConversationTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      tag_name: "Inexistente",
    })) as { error?: string };
    expect(result.error).toBeTruthy();
  });

  test("rejeita tag_name só de espaços", async () => {
    const ctx = {
      ...baseCtx,
      supabase: makeSupabase({ existingTag: null }),
    };
    const t = makeApplyTagToConversationTool(ctx);
    const result = (await (t.execute as (i: unknown) => Promise<unknown>)({
      tag_name: "   ",
    })) as { error?: string };
    expect(result.error).toContain("vazio");
  });
});
