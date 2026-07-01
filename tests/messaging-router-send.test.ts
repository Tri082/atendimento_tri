import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireOrgMember: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => Promise.resolve(fn()) }));
vi.mock("@/lib/messaging/router", () => ({ processSendOutbound: vi.fn() }));

import { requireOrgMember } from "@/lib/auth/guards";
import { sendMessageAction } from "@/lib/messaging/actions";
import { createClient } from "@/lib/supabase/server";

const mockedCreate = createClient as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = requireOrgMember as unknown as ReturnType<typeof vi.fn>;

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const CONV_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "33333333-3333-3333-3333-333333333333";

function makeSupabase(opts: {
  conversation: {
    id: string;
    organization_id: string;
    channel: { id: string; type: string; config: unknown };
    external_thread_id: string;
    last_inbound_at: string | null;
  } | null;
  insertResult?: { id: string };
}) {
  const updates: unknown[] = [];
  const inserts: unknown[] = [];

  const builder = {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.conversation, error: null }),
          }),
          maybeSingle: async () => ({ data: opts.conversation, error: null }),
        }),
      }),
      insert: (payload: unknown) => {
        inserts.push(payload);
        return {
          select: () => ({
            single: async () => ({
              data: opts.insertResult ?? { id: "msg-new" },
              error: null,
            }),
          }),
        };
      },
      update: (payload: unknown) => {
        updates.push(payload);
        return { eq: () => ({ eq: async () => ({ error: null }) }) };
      },
    }),
    __updates: updates,
    __inserts: inserts,
  };
  return builder;
}

describe("sendMessageAction", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedAuth.mockReset();
  });

  test("happy path: insere mensagem e retorna ok", async () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 60_000).toISOString(); // 1 min atrás

    const sb = makeSupabase({
      conversation: {
        id: CONV_ID,
        organization_id: ORG_ID,
        channel: { id: "ch-1", type: "mock", config: {} },
        external_thread_id: "+5511987654321",
        last_inbound_at: recent,
      },
    });

    mockedCreate.mockResolvedValue(sb);
    mockedAuth.mockResolvedValue({
      user: { id: USER_ID },
      org: { id: ORG_ID, slug: "acme" },
      role: "member",
    });

    const r = await sendMessageAction({
      orgSlug: "acme",
      conversationId: CONV_ID,
      body: "Oi",
    });

    expect(r).toEqual({ ok: true, data: { messageId: "msg-new" } });
    expect(sb.__inserts[0]).toMatchObject({
      conversation_id: CONV_ID,
      direction: "outbound",
      sender_kind: "user",
      status: "sending",
      body: "Oi",
    });
  });

  test("retorna erro de validação se sem body e sem media", async () => {
    const r = await sendMessageAction({
      orgSlug: "acme",
      conversationId: CONV_ID,
    } as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/texto ou mídia/);
  });

  test("conversation não encontrada retorna erro", async () => {
    mockedCreate.mockResolvedValue(makeSupabase({ conversation: null }));
    mockedAuth.mockResolvedValue({
      user: { id: USER_ID },
      org: { id: ORG_ID },
      role: "member",
    });

    const r = await sendMessageAction({
      orgSlug: "acme",
      conversationId: CONV_ID,
      body: "Oi",
    });
    expect(r.ok).toBe(false);
  });

  test("WhatsApp fora da janela de 24h sem template é bloqueado", async () => {
    const old = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    const sb = makeSupabase({
      conversation: {
        id: CONV_ID,
        organization_id: ORG_ID,
        channel: { id: "ch-1", type: "whatsapp_cloud", config: {} },
        external_thread_id: "+5511987654321",
        last_inbound_at: old,
      },
    });
    mockedCreate.mockResolvedValue(sb);
    mockedAuth.mockResolvedValue({
      user: { id: USER_ID },
      org: { id: ORG_ID },
      role: "member",
    });

    const r = await sendMessageAction({
      orgSlug: "acme",
      conversationId: CONV_ID,
      body: "Oi",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/24h/);
  });

  test("WhatsApp dentro da janela passa", async () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const sb = makeSupabase({
      conversation: {
        id: CONV_ID,
        organization_id: ORG_ID,
        channel: { id: "ch-1", type: "whatsapp_cloud", config: {} },
        external_thread_id: "+5511987654321",
        last_inbound_at: recent,
      },
    });
    mockedCreate.mockResolvedValue(sb);
    mockedAuth.mockResolvedValue({
      user: { id: USER_ID },
      org: { id: ORG_ID },
      role: "member",
    });

    const r = await sendMessageAction({
      orgSlug: "acme",
      conversationId: CONV_ID,
      body: "Oi",
    });
    expect(r.ok).toBe(true);
  });

  test("canal mock NÃO sofre check de 24h (não é whatsapp)", async () => {
    const veryOld = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
    const sb = makeSupabase({
      conversation: {
        id: CONV_ID,
        organization_id: ORG_ID,
        channel: { id: "ch-1", type: "mock", config: {} },
        external_thread_id: "+5511987654321",
        last_inbound_at: veryOld,
      },
    });
    mockedCreate.mockResolvedValue(sb);
    mockedAuth.mockResolvedValue({
      user: { id: USER_ID },
      org: { id: ORG_ID },
      role: "member",
    });

    const r = await sendMessageAction({
      orgSlug: "acme",
      conversationId: CONV_ID,
      body: "Oi",
    });
    expect(r.ok).toBe(true);
  });
});

describe("processSendOutbound dispatch", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
  });

  test("chama adapter.sendTemplate quando provider_metadata.template presente", async () => {
    const sendTplCalls: unknown[] = [];
    const sendMsgCalls: unknown[] = [];

    // Substituir o adapter mock por uma versão espionável
    const msgRow = {
      id: "msg-1",
      organization_id: ORG_ID,
      conversation_id: CONV_ID,
      body: "[template: x]",
      media_url: null,
      media_type: null,
      reply_to_message_id: null,
      status: "sending",
      provider_metadata: {
        template: { name: "boas_vindas", language: "pt_BR", params: { nome: "João" } },
      },
      conversation: {
        channel_id: "ch-1",
        external_thread_id: "+5511987654321",
        channel: { id: "ch-1", type: "mock", config: {} },
      },
    };

    const sb = {
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: msgRow, error: null }),
          }),
        }),
        update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      }),
    };

    vi.doUnmock("@/lib/messaging/router");
    vi.resetModules();

    // Após resetModules: re-importar supabase mocks e configurá-los
    // processSendOutbound usa createServiceClient (worker context, sem cookies).
    const { createServiceClient: freshServiceCreate } = await import(
      "@/lib/supabase/service"
    );
    (freshServiceCreate as ReturnType<typeof vi.fn>).mockReturnValue(sb);

    // Importar adaptador (auto-registra) e pegar referência do adapter
    await import("@/lib/messaging/adapters/mock");
    const { getAdapter } = await import("@/lib/messaging/registry");
    const mockAdapter = getAdapter("mock");
    const origSendTemplate = mockAdapter.sendTemplate;
    const origSendMessage = mockAdapter.sendMessage;
    mockAdapter.sendTemplate = vi.fn(async (...args) => {
      sendTplCalls.push(args);
      return { externalId: "tpl-x" };
    });
    mockAdapter.sendMessage = vi.fn(async (...args) => {
      sendMsgCalls.push(args);
      return { externalId: "msg-x" };
    });

    const { processSendOutbound } = await import("@/lib/messaging/router");

    await processSendOutbound("msg-1");

    expect(sendTplCalls).toHaveLength(1);
    expect(sendMsgCalls).toHaveLength(0);

    mockAdapter.sendTemplate = origSendTemplate;
    mockAdapter.sendMessage = origSendMessage;
  });
});
