import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (b: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(b), {
        ...init,
        headers: { "content-type": "application/json" },
      }),
  },
}));

import { createServiceClient } from "@/lib/supabase/service";

const mockedCreate = createServiceClient as unknown as ReturnType<typeof vi.fn>;

function makeSb(updatedRows: { id: string }[]) {
  const updates: unknown[] = [];
  return {
    sb: {
      from: () => ({
        update: (p: unknown) => {
          updates.push(p);
          return {
            eq: () => ({
              lt: () => ({
                select: async () => ({ data: updatedRows, error: null }),
              }),
            }),
          };
        },
      }),
    },
    updates,
  };
}

describe("recover-messages cron", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  test("401 sem authorization", async () => {
    const { GET } = await import("@/app/api/cron/recover-messages/route");
    const res = await GET(new Request("http://x/api/cron/recover-messages"));
    expect(res.status).toBe(401);
  });

  test("200 e marca órfãos como failed", async () => {
    const { sb, updates } = makeSb([{ id: "msg-1" }, { id: "msg-2" }]);
    mockedCreate.mockReturnValue(sb);

    const { GET } = await import("@/app/api/cron/recover-messages/route");
    const res = await GET(
      new Request("http://x/api/cron/recover-messages", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { updated: number };
    expect(body.updated).toBe(2);
    expect(updates[0]).toMatchObject({
      status: "failed",
      failure_reason: expect.stringContaining("Timeout"),
    });
  });
});
