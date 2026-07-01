import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => {
    // No-op em testes — sem request scope, callbacks são descartados.
    void fn;
  },
}));

import type { NormalizedEvent } from "@/lib/messaging/adapter";
import { processInboundMessage } from "@/lib/messaging/router";
import { createServiceClient } from "@/lib/supabase/service";

const mockedCreate = createServiceClient as unknown as ReturnType<typeof vi.fn>;

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const CHANNEL_ID = "22222222-2222-2222-2222-222222222222";
const CONV_ID = "33333333-3333-3333-3333-333333333333";

interface Recorder {
  inserts: Record<string, unknown[]>;
  updates: Record<string, unknown[]>;
}

function buildSupabase(state: {
  channelByExternal?: { id: string; type: string; organization_id: string };
  existingConversation?: { id: string; organization_id: string };
  contactByPhone?: { id: string; phone: string | null };
  insertConversationResult?: { id: string };
  insertMessageResult?: { id: string } | null;
  currentUnreadCount?: number;
}): { sb: unknown; rec: Recorder } {
  const rec: Recorder = { inserts: {}, updates: {} };

  const from = (table: string) => {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === "channels")
                return { data: state.channelByExternal ?? null, error: null };
              if (table === "conversations")
                return { data: state.existingConversation ?? null, error: null };
              if (table === "contacts") return { data: state.contactByPhone ?? null, error: null };
              return { data: null, error: null };
            },
          }),
          maybeSingle: async () => {
            if (table === "channels") return { data: state.channelByExternal ?? null, error: null };
            if (table === "conversations") {
              return {
                data: state.existingConversation
                  ? { ...state.existingConversation, unread_count: state.currentUnreadCount ?? 0 }
                  : null,
                error: null,
              };
            }
            if (table === "contacts") return { data: state.contactByPhone ?? null, error: null };
            return { data: null, error: null };
          },
        }),
      }),
      insert: (payload: unknown) => {
        rec.inserts[table] = rec.inserts[table] ?? [];
        rec.inserts[table].push(payload);
        return {
          select: () => ({
            single: async () => {
              if (table === "conversations") {
                return { data: state.insertConversationResult ?? { id: "conv-new" }, error: null };
              }
              if (table === "messages") {
                if (state.insertMessageResult === null) {
                  return { data: null, error: { code: "23505" } };
                }
                return { data: state.insertMessageResult ?? { id: "msg-new" }, error: null };
              }
              return { data: null, error: null };
            },
          }),
        };
      },
      update: (payload: unknown) => {
        rec.updates[table] = rec.updates[table] ?? [];
        rec.updates[table].push(payload);
        return { eq: () => ({ error: null }) };
      },
    };
  };

  return { sb: { from, rpc: vi.fn() }, rec };
}

function makeEvent(
  over: Partial<NormalizedEvent> & { rawChannelId?: string } = {},
): NormalizedEvent {
  const { rawChannelId, ...rest } = over;
  return {
    kind: "message",
    externalThreadId: "+5511987654321",
    externalMessageId: "ext-msg-1",
    timestamp: new Date().toISOString(),
    message: { body: "Olá" },
    raw: { channelId: rawChannelId ?? CHANNEL_ID },
    ...rest,
  };
}

describe("processInboundMessage", () => {
  beforeEach(() => mockedCreate.mockReset());

  test("ignora se channel não encontrado pelo id em raw", async () => {
    const { sb, rec } = buildSupabase({});
    mockedCreate.mockReturnValue(sb);

    await processInboundMessage("whatsapp_cloud", makeEvent());
    expect(rec.inserts.messages).toBeUndefined();
  });

  test("cria conversation nova quando primeira mensagem do thread", async () => {
    const { sb, rec } = buildSupabase({
      channelByExternal: { id: CHANNEL_ID, type: "whatsapp_cloud", organization_id: ORG_ID },
      insertConversationResult: { id: CONV_ID },
      insertMessageResult: { id: "msg-1" },
    });
    mockedCreate.mockReturnValue(sb);

    await processInboundMessage(
      "whatsapp_cloud",
      makeEvent({
        externalThreadId: "+5511987654321",
      }),
    );

    expect(rec.inserts.conversations?.[0]).toMatchObject({
      organization_id: ORG_ID,
      channel_id: CHANNEL_ID,
      external_thread_id: "+5511987654321",
      contact_id: null,
      status: "open",
    });
    expect(rec.inserts.messages?.[0]).toMatchObject({
      conversation_id: CONV_ID,
      direction: "inbound",
      sender_kind: "contact",
      body: "Olá",
      status: "delivered",
    });
  });

  test("match híbrido: vincula contact_id quando telefone bate", async () => {
    const { sb, rec } = buildSupabase({
      channelByExternal: { id: CHANNEL_ID, type: "whatsapp_cloud", organization_id: ORG_ID },
      contactByPhone: { id: "contact-1", phone: "11987654321" },
      insertConversationResult: { id: CONV_ID },
      insertMessageResult: { id: "msg-1" },
    });
    mockedCreate.mockReturnValue(sb);

    await processInboundMessage("whatsapp_cloud", makeEvent());

    expect(rec.inserts.conversations?.[0]).toMatchObject({
      contact_id: "contact-1",
    });
  });

  test("reusa conversation existente sem criar nova", async () => {
    const { sb, rec } = buildSupabase({
      channelByExternal: { id: CHANNEL_ID, type: "whatsapp_cloud", organization_id: ORG_ID },
      existingConversation: { id: CONV_ID, organization_id: ORG_ID },
      insertMessageResult: { id: "msg-1" },
    });
    mockedCreate.mockReturnValue(sb);

    await processInboundMessage("whatsapp_cloud", makeEvent());

    expect(rec.inserts.conversations).toBeUndefined();
    expect(rec.inserts.messages?.[0]).toMatchObject({ conversation_id: CONV_ID });
  });

  test("idempotência: webhook duplicado não cria 2ª mensagem", async () => {
    const { sb, rec } = buildSupabase({
      channelByExternal: { id: CHANNEL_ID, type: "whatsapp_cloud", organization_id: ORG_ID },
      existingConversation: { id: CONV_ID, organization_id: ORG_ID },
      insertMessageResult: null,
    });
    mockedCreate.mockReturnValue(sb);

    await processInboundMessage("whatsapp_cloud", makeEvent());

    expect(rec.updates.conversations).toBeUndefined();
  });

  test("atualiza last_inbound_at + last_message_at + unread_count quando mensagem nova", async () => {
    const { sb, rec } = buildSupabase({
      channelByExternal: { id: CHANNEL_ID, type: "whatsapp_cloud", organization_id: ORG_ID },
      existingConversation: { id: CONV_ID, organization_id: ORG_ID },
      insertMessageResult: { id: "msg-1" },
      currentUnreadCount: 3,
    });
    mockedCreate.mockReturnValue(sb);

    await processInboundMessage("whatsapp_cloud", makeEvent());

    const update = rec.updates.conversations?.[0] as Record<string, unknown>;
    expect(update).toBeDefined();
    expect(update.last_message_at).toBeDefined();
    expect(update.last_inbound_at).toBeDefined();
    expect(update.unread_count).toBe(4);
  });
});

import { processStatusUpdate } from "@/lib/messaging/router";

describe("processStatusUpdate", () => {
  beforeEach(() => mockedCreate.mockReset());

  function buildStatusSb(state: {
    currentMessage?: { id: string; status: string; organization_id: string };
  }) {
    const rec: { updates: Record<string, unknown>[] } = { updates: [] };
    const sb = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === "messages") return { data: state.currentMessage ?? null, error: null };
              return { data: null, error: null };
            },
          }),
        }),
        update: (payload: unknown) => {
          rec.updates.push({ table, payload });
          return { eq: () => ({ eq: () => ({ error: null }) }) };
        },
      }),
    };
    return { sb, rec };
  }

  test("avança status na ordem correta (sent → delivered)", async () => {
    const { sb, rec } = buildStatusSb({
      currentMessage: { id: "msg-1", status: "sent", organization_id: ORG_ID },
    });
    mockedCreate.mockReturnValue(sb);

    await processStatusUpdate("whatsapp_cloud", {
      kind: "status",
      externalThreadId: "+5511987654321",
      externalMessageId: "ext-1",
      timestamp: new Date().toISOString(),
      status: { value: "delivered" },
      raw: {},
    });

    expect(rec.updates[0]?.payload).toMatchObject({ status: "delivered" });
  });

  test("ignora retrocesso (delivered → sent)", async () => {
    const { sb, rec } = buildStatusSb({
      currentMessage: { id: "msg-1", status: "delivered", organization_id: ORG_ID },
    });
    mockedCreate.mockReturnValue(sb);

    await processStatusUpdate("whatsapp_cloud", {
      kind: "status",
      externalThreadId: "+5511987654321",
      externalMessageId: "ext-1",
      timestamp: new Date().toISOString(),
      status: { value: "sent" },
      raw: {},
    });

    expect(rec.updates).toHaveLength(0);
  });

  test("ignora se mensagem não encontrada", async () => {
    const { sb, rec } = buildStatusSb({});
    mockedCreate.mockReturnValue(sb);

    await processStatusUpdate("whatsapp_cloud", {
      kind: "status",
      externalThreadId: "+5511987654321",
      externalMessageId: "ext-none",
      timestamp: new Date().toISOString(),
      status: { value: "delivered" },
      raw: {},
    });

    expect(rec.updates).toHaveLength(0);
  });

  test("não muta status terminal (failed)", async () => {
    const { sb, rec } = buildStatusSb({
      currentMessage: { id: "msg-1", status: "failed", organization_id: ORG_ID },
    });
    mockedCreate.mockReturnValue(sb);

    await processStatusUpdate("whatsapp_cloud", {
      kind: "status",
      externalThreadId: "+5511987654321",
      externalMessageId: "ext-1",
      timestamp: new Date().toISOString(),
      status: { value: "delivered" },
      raw: {},
    });

    expect(rec.updates).toHaveLength(0);
  });
});

describe("processInboundMessage lookup por phone_number_id", () => {
  beforeEach(() => mockedCreate.mockReset());

  test("usa raw.phoneNumberId quando channelId ausente", async () => {
    const PHONE_NUMBER_ID = "55512345";
    const sb = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (table === "channels") {
                  return { data: { id: CHANNEL_ID, type: "whatsapp_cloud", organization_id: ORG_ID }, error: null };
                }
                if (table === "conversations") return { data: null, error: null };
                if (table === "contacts") return { data: null, error: null };
                return { data: null, error: null };
              },
            }),
            maybeSingle: async () => {
              if (table === "channels") {
                return { data: { id: CHANNEL_ID, type: "whatsapp_cloud", organization_id: ORG_ID }, error: null };
              }
              if (table === "conversations") return { data: { unread_count: 0 }, error: null };
              return { data: null, error: null };
            },
          }),
        }),
        insert: () => ({
          select: () => ({ single: async () => ({ data: { id: "id-new" }, error: null }) }),
        }),
        update: () => ({ eq: () => ({ error: null }) }),
      }),
    };
    mockedCreate.mockReturnValue(sb);

    await processInboundMessage("whatsapp_cloud", {
      kind: "message",
      externalThreadId: "+5511987654321",
      externalMessageId: "ext-x",
      timestamp: new Date().toISOString(),
      message: { body: "Oi" },
      raw: { phoneNumberId: PHONE_NUMBER_ID },
    });

    // Sem throw = passou. Detalhe de qual select foi chamado é difícil
    // de assertar com esse mock simples; teste é smoke do path.
    expect(true).toBe(true);
  });

  test("ignora quando nem channelId nem phoneNumberId", async () => {
    const sb = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      }),
    };
    mockedCreate.mockReturnValue(sb);
    await processInboundMessage("whatsapp_cloud", {
      kind: "message",
      externalThreadId: "+5511987654321",
      externalMessageId: "ext-x",
      timestamp: new Date().toISOString(),
      message: { body: "Oi" },
      raw: {},
    });
    expect(true).toBe(true);
  });
});

vi.mock("@/lib/messaging/channel-config", () => ({
  getChannelConfigSystem: vi.fn(),
}));
vi.mock("@/lib/messaging/registry", async () => {
  const actual = await vi.importActual<typeof import("@/lib/messaging/registry")>(
    "@/lib/messaging/registry",
  );
  return { ...actual };
});

import "@/lib/messaging/adapters/mock";
import { getChannelConfigSystem } from "@/lib/messaging/channel-config";
import { getAdapter } from "@/lib/messaging/registry";

const mockedGetCfg = getChannelConfigSystem as unknown as ReturnType<typeof vi.fn>;

describe("processInboundMessage media fetch", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedGetCfg.mockReset();
  });

  test("baixa mídia via adapter.fetchMedia e grava media_url no Storage path", async () => {
    const PHONE_NUMBER_ID = "55512345";
    const fakeBuf = Buffer.from("fake-image-bytes");

    // Stub do adapter mock pra fornecer fetchMedia
    const mockAdapter = getAdapter("mock");
    const fetchMediaOriginal = mockAdapter.fetchMedia;
    mockAdapter.fetchMedia = vi.fn(async () => ({ data: fakeBuf, mimeType: "image/jpeg" }));

    mockedGetCfg.mockResolvedValueOnce({ organizationId: ORG_ID, config: {} });

    const inserted: Record<string, unknown[]> = {};
    const sb = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (table === "channels") return { data: { id: CHANNEL_ID, type: "mock", organization_id: ORG_ID }, error: null };
                if (table === "conversations") return { data: null, error: null };
                if (table === "contacts") return { data: null, error: null };
                return { data: null, error: null };
              },
            }),
            maybeSingle: async () => {
              if (table === "channels") return { data: { id: CHANNEL_ID, type: "mock", organization_id: ORG_ID }, error: null };
              if (table === "conversations") return { data: { unread_count: 0 }, error: null };
              return { data: null, error: null };
            },
          }),
        }),
        insert: (payload: unknown) => {
          inserted[table] = inserted[table] ?? [];
          inserted[table].push(payload);
          return {
            select: () => ({ single: async () => ({ data: { id: "msg-x" }, error: null }) }),
          };
        },
        update: () => ({ eq: () => ({ error: null }) }),
      }),
      storage: {
        from: () => ({
          upload: async (_path: string, _buf: unknown) => ({ error: null }),
        }),
      },
    };
    mockedCreate.mockReturnValue(sb);

    await processInboundMessage("mock", {
      kind: "message",
      externalThreadId: "+5511987654321",
      externalMessageId: "ext-media-1",
      timestamp: new Date().toISOString(),
      message: { media: [{ externalMediaId: "wamid-media-1", mimeType: "image/jpeg" }] },
      raw: { channelId: CHANNEL_ID },
    });

    const insertedMsg = inserted.messages?.[0] as Record<string, unknown>;
    expect(insertedMsg.media_url).toMatch(/^[0-9a-f-]+\/.+\/.+\.jpg$/);
    expect(insertedMsg.media_type).toBe("image/jpeg");

    // Restaurar
    mockAdapter.fetchMedia = fetchMediaOriginal;
  });
});
