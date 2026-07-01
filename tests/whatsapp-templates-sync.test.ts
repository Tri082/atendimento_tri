import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { applyTemplateSync } from "@/lib/messaging/templates/sync";

const mockedCreate = createClient as unknown as ReturnType<typeof vi.fn>;
const ORG_ID = "11111111-1111-1111-1111-111111111111";
const CHANNEL_ID = "22222222-2222-2222-2222-222222222222";

function makeSb(existing: { name: string; language: string; id: string }[]) {
  const upserts: unknown[] = [];
  const deleteCalls: { ids: string[] }[] = [];

  const sb = {
    from: () => ({
      select: (cols: string) => ({
        eq: (col1: string, val1: string) => {
          // Return all existing for the channel
          if (cols.includes("name") && col1 === "channel_id") {
            return {
              eq: () => ({
                eq: async () => ({ data: existing, error: null }),
              }),
              // Subquery to find ID by (name, language) for delete
              eq2: () => ({}),
              data: existing,
              error: null,
              then: undefined,
            };
          }
          // 2-eq chain for ID lookup of templates to remove
          return {
            eq: (col2: string, val2: string) => {
              if (col1 === "channel_id" && col2 === "name") {
                // Match by name from existing
                const match = existing.find((e) => e.name === val2);
                return Promise.resolve({ data: match ? [{ id: match.id }] : [], error: null });
              }
              return Promise.resolve({ data: [], error: null });
            },
          };
        },
      }),
      upsert: (payload: unknown) => {
        upserts.push(payload);
        return { error: null };
      },
      delete: () => ({
        eq: () => ({
          in: async (_col: string, ids: string[]) => {
            deleteCalls.push({ ids });
            return { error: null };
          },
        }),
      }),
    }),
  };
  return { sb, upserts, deleteCalls };
}

describe("applyTemplateSync", () => {
  beforeEach(() => mockedCreate.mockReset());

  test("upsert dos templates novos + remoção dos que sumiram", async () => {
    const existing = [
      { name: "removido", language: "pt_BR", id: "id-removido" },
      { name: "mantido", language: "pt_BR", id: "id-mantido" },
    ];
    const { sb, upserts, deleteCalls } = makeSb(existing);
    mockedCreate.mockResolvedValue(sb);

    const remoteTemplates = [
      {
        metaId: "t1",
        name: "mantido",
        language: "pt_BR",
        category: "MARKETING" as const,
        status: "APPROVED" as const,
        components: [],
        paramCount: 0,
      },
      {
        metaId: "t2",
        name: "novo",
        language: "pt_BR",
        category: "UTILITY" as const,
        status: "APPROVED" as const,
        components: [],
        paramCount: 1,
      },
    ];

    const result = await applyTemplateSync({
      organizationId: ORG_ID,
      channelId: CHANNEL_ID,
      templates: remoteTemplates,
    });

    expect(result.synced).toBe(2);
    expect(result.removed).toBe(1);

    expect(upserts).toHaveLength(1);
    expect(Array.isArray(upserts[0])).toBe(true);
    expect((upserts[0] as unknown[]).length).toBe(2);

    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0]?.ids).toContain("id-removido");
  });

  test("sem mudanças quando local e remoto são iguais", async () => {
    const existing = [{ name: "a", language: "pt_BR", id: "id-a" }];
    const { sb, deleteCalls } = makeSb(existing);
    mockedCreate.mockResolvedValue(sb);

    const result = await applyTemplateSync({
      organizationId: ORG_ID,
      channelId: CHANNEL_ID,
      templates: [
        {
          metaId: "t1",
          name: "a",
          language: "pt_BR",
          category: "UTILITY" as const,
          status: "APPROVED" as const,
          components: [],
          paramCount: 0,
        },
      ],
    });

    expect(result.synced).toBe(1);
    expect(result.removed).toBe(0);
    expect(deleteCalls).toHaveLength(0);
  });
});
