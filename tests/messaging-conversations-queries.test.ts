import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getConversationsList } from "@/lib/messaging/conversations/queries";

const mockedCreate = createClient as unknown as ReturnType<typeof vi.fn>;

function makeQueryBuilder(orderCalls: unknown[][]) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: (...args: unknown[]) => {
      orderCalls.push(args);
      return builder;
    },
    range: () => builder,
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  };
  return builder;
}

describe("getConversationsList", () => {
  beforeEach(() => mockedCreate.mockReset());

  test("ordena handoff_requested_at (mais antigo primeiro) antes de last_message_at", async () => {
    const orderCalls: unknown[][] = [];
    const builder = makeQueryBuilder(orderCalls);
    mockedCreate.mockResolvedValue({ from: () => builder });

    await getConversationsList("org-1", {});

    expect(orderCalls[0]).toEqual(["handoff_requested_at", { ascending: true, nullsFirst: false }]);
    expect(orderCalls[1]).toEqual(["last_message_at", { ascending: false, nullsFirst: false }]);
  });
});
