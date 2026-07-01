import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireOrgRole: vi.fn(),
}));

import { requireOrgRole } from "@/lib/auth/guards";
import { getChannelConfig } from "@/lib/messaging/channel-config";
import { createClient } from "@/lib/supabase/server";

const mockedCreate = createClient as unknown as ReturnType<typeof vi.fn>;
const mockedRole = requireOrgRole as unknown as ReturnType<typeof vi.fn>;

function makeSb(channelRow: { organization_id: string; config: unknown } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: channelRow, error: null }),
        }),
      }),
    }),
  };
}

describe("getChannelConfig", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedRole.mockReset();
  });

  test("retorna config quando admin", async () => {
    const orgId = "11111111-1111-1111-1111-111111111111";
    const channelId = "22222222-2222-2222-2222-222222222222";

    mockedCreate.mockResolvedValueOnce(
      makeSb({ organization_id: orgId, config: { accessToken: "tok123" } }),
    );
    mockedRole.mockResolvedValueOnce({ org: { id: orgId, slug: "acme" } });

    const r = await getChannelConfig({ channelId, orgSlug: "acme" });
    expect(r).toEqual({ accessToken: "tok123" });
    expect(mockedRole).toHaveBeenCalledWith({
      orgSlug: "acme",
      roles: ["owner", "admin"],
    });
  });

  test("retorna null quando channel não existe", async () => {
    mockedCreate.mockResolvedValueOnce(makeSb(null));
    mockedRole.mockResolvedValueOnce({ org: { id: "x", slug: "acme" } });

    const r = await getChannelConfig({ channelId: "deadbeef-...", orgSlug: "acme" });
    expect(r).toBeNull();
  });

  test("retorna null quando channel é de outra org (defesa em profundidade)", async () => {
    mockedCreate.mockResolvedValueOnce(makeSb({ organization_id: "OUTRA-ORG", config: { x: 1 } }));
    mockedRole.mockResolvedValueOnce({ org: { id: "ESSA-ORG", slug: "acme" } });

    const r = await getChannelConfig({ channelId: "x", orgSlug: "acme" });
    expect(r).toBeNull();
  });
});
