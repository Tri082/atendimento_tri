import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({
  requireOrgRole: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => Promise.resolve(fn()) }));

import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";
import {
  connectWhatsappChannelAction,
  disconnectWhatsappChannelAction,
} from "@/lib/messaging/adapters/whatsapp-cloud/actions";

const mockedCreate = createClient as unknown as ReturnType<typeof vi.fn>;
const mockedRole = requireOrgRole as unknown as ReturnType<typeof vi.fn>;

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

const VALID_CONFIG = {
  phoneNumberId: "123456789012345",
  wabaId: "987654321098765",
  accessToken: "EAAB" + "x".repeat(50),
  appSecret: "a".repeat(32),
};

describe("connectWhatsappChannelAction", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedRole.mockReset();
  });

  test("happy path: cria channel + retorna verifyToken UUID", async () => {
    mockedRole.mockResolvedValue({ user: { id: USER_ID }, org: { id: ORG_ID }, role: "owner" });
    mockedCreate.mockResolvedValue({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: "ch-new" }, error: null }),
          }),
        }),
      }),
    });

    const r = await connectWhatsappChannelAction({
      orgSlug: "acme",
      name: "WhatsApp Vendas",
      config: VALID_CONFIG,
    });

    expect(r.ok).toBe(true);
    if (r.ok && r.data) {
      expect(r.data.channelId).toBe("ch-new");
      expect(r.data.verifyToken).toMatch(/^[0-9a-f-]+$/);
    }
  });

  test("rejeita config inválida", async () => {
    const r = await connectWhatsappChannelAction({
      orgSlug: "acme",
      name: "x",
      config: { ...VALID_CONFIG, phoneNumberId: "abc" },
    });
    expect(r.ok).toBe(false);
  });
});

describe("disconnectWhatsappChannelAction", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedRole.mockReset();
  });

  test("DELETE channel quando admin", async () => {
    mockedRole.mockResolvedValue({ user: { id: USER_ID }, org: { id: ORG_ID }, role: "admin" });

    const deletes: unknown[] = [];
    mockedCreate.mockResolvedValue({
      from: () => ({
        delete: () => {
          deletes.push("called");
          return { eq: () => ({ eq: async () => ({ error: null }) }) };
        },
      }),
    });

    const r = await disconnectWhatsappChannelAction({
      orgSlug: "acme",
      channelId: "11111111-1111-1111-1111-111111111111",
    });
    expect(r.ok).toBe(true);
    expect(deletes).toHaveLength(1);
  });
});
