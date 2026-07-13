import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireOrgMember: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => Promise.resolve(fn()) }));
vi.mock("@/lib/messaging/router", () => ({ processSendOutbound: vi.fn() }));

import { requireOrgMember } from "@/lib/auth/guards";
import { resolveConversationAction } from "@/lib/messaging/conversations/actions";
import { createClient } from "@/lib/supabase/server";

const mockedCreate = createClient as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = requireOrgMember as unknown as ReturnType<typeof vi.fn>;

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const CONV_ID = "22222222-2222-2222-2222-222222222222";

function makeSupabase() {
  const updates: unknown[] = [];
  const builder = {
    from: (_table: string) => ({
      update: (payload: unknown) => {
        updates.push(payload);
        return { eq: () => ({ eq: async () => ({ error: null }) }) };
      },
    }),
    __updates: updates,
  };
  return builder;
}

describe("resolveConversationAction", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedAuth.mockReset();
  });

  test("resolver a conversa limpa handoff_requested_at junto com o status", async () => {
    const sb = makeSupabase();
    mockedCreate.mockResolvedValue(sb);
    mockedAuth.mockResolvedValue({ org: { id: ORG_ID }, user: { id: "u1" }, role: "member" });

    const r = await resolveConversationAction({
      orgSlug: "acme",
      conversationId: CONV_ID,
      resolved: true,
    });

    expect(r).toEqual({ ok: true });
    expect(sb.__updates[0]).toMatchObject({ status: "resolved", handoff_requested_at: null });
  });

  test("reabrir a conversa também limpa handoff_requested_at", async () => {
    const sb = makeSupabase();
    mockedCreate.mockResolvedValue(sb);
    mockedAuth.mockResolvedValue({ org: { id: ORG_ID }, user: { id: "u1" }, role: "member" });

    const r = await resolveConversationAction({
      orgSlug: "acme",
      conversationId: CONV_ID,
      resolved: false,
    });

    expect(r).toEqual({ ok: true });
    expect(sb.__updates[0]).toMatchObject({ status: "open", handoff_requested_at: null });
  });
});
