import { describe, expect, test } from "vitest";
import { parseWebhook } from "@/lib/messaging/adapters/whatsapp-evolution/parse-webhook";

const TEXT_MESSAGE_PAYLOAD = {
  event: "messages.upsert",
  instance: "minha-empresa",
  data: {
    key: { remoteJid: "5511999990000@s.whatsapp.net", fromMe: false, id: "ABCD1234" },
    pushName: "João",
    message: { conversation: "Olá!" },
    messageType: "conversation",
    messageTimestamp: 1717440000,
  },
};

const EXTENDED_TEXT_PAYLOAD = {
  event: "messages.upsert",
  instance: "minha-empresa",
  data: {
    key: { remoteJid: "5511999990000@s.whatsapp.net", fromMe: false, id: "ABCD1235" },
    message: { extendedTextMessage: { text: "Texto formatado" } },
    messageType: "extendedTextMessage",
    messageTimestamp: 1717440100,
  },
};

const IMAGE_MESSAGE_PAYLOAD = {
  event: "messages.upsert",
  instance: "minha-empresa",
  data: {
    key: { remoteJid: "5511999990000@s.whatsapp.net", fromMe: false, id: "IMG-1" },
    message: { imageMessage: { mimetype: "image/jpeg", caption: "foto" } },
    messageType: "imageMessage",
    messageTimestamp: 1717440200,
  },
};

const FROMME_PAYLOAD = {
  event: "messages.upsert",
  instance: "minha-empresa",
  data: {
    key: { remoteJid: "5511999990000@s.whatsapp.net", fromMe: true, id: "OUT-1" },
    message: { conversation: "resposta do bot" },
    messageType: "conversation",
    messageTimestamp: 1717440300,
  },
};

const STATUS_UPDATE_DELIVERED = {
  event: "messages.update",
  instance: "minha-empresa",
  data: {
    keyId: "ABCD1234",
    status: 2,
    remoteJid: "5511999990000@s.whatsapp.net",
  },
};

const STATUS_UPDATE_READ = {
  event: "messages.update",
  instance: "minha-empresa",
  data: { keyId: "ABCD1234", status: 3, remoteJid: "5511999990000@s.whatsapp.net" },
};

describe("parseWebhook — mensagens", () => {
  test("messages.upsert com conversation → 1 NormalizedEvent message", () => {
    const events = parseWebhook(TEXT_MESSAGE_PAYLOAD);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "message",
      externalThreadId: "+5511999990000",
      externalMessageId: "ABCD1234",
      message: { body: "Olá!" },
    });
  });

  test("extendedTextMessage extrai .text como body", () => {
    const events = parseWebhook(EXTENDED_TEXT_PAYLOAD);
    expect(events).toHaveLength(1);
    expect(events[0]?.message?.body).toBe("Texto formatado");
  });

  test("imageMessage gera media com externalMediaId = key.id, mimeType correto", () => {
    const events = parseWebhook(IMAGE_MESSAGE_PAYLOAD);
    expect(events).toHaveLength(1);
    expect(events[0]?.message?.body).toBe("foto");
    expect(events[0]?.message?.media).toEqual([
      { externalMediaId: "IMG-1", mimeType: "image/jpeg" },
    ]);
  });

  test("fromMe: true vira evento com fromMe=true (router decide via idempotência)", () => {
    const events = parseWebhook(FROMME_PAYLOAD);
    expect(events).toHaveLength(1);
    expect(events[0]?.fromMe).toBe(true);
  });

  test("raw inclui instanceName pro lookup do router", () => {
    const events = parseWebhook(TEXT_MESSAGE_PAYLOAD);
    expect(events[0]?.raw).toMatchObject({ instanceName: "minha-empresa" });
  });

  test("timestamp ISO correto", () => {
    const events = parseWebhook(TEXT_MESSAGE_PAYLOAD);
    expect(events[0]?.timestamp).toBe("2024-06-03T18:40:00.000Z");
  });
});

describe("parseWebhook — status updates", () => {
  test("status=2 → kind=status, value=delivered", () => {
    const events = parseWebhook(STATUS_UPDATE_DELIVERED);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "status",
      externalMessageId: "ABCD1234",
      status: { value: "delivered" },
    });
  });

  test("status=3 → kind=status, value=read", () => {
    const events = parseWebhook(STATUS_UPDATE_READ);
    expect(events[0]?.status?.value).toBe("read");
  });
});

describe("parseWebhook — robustez", () => {
  test("payload null retorna []", () => {
    expect(parseWebhook(null)).toEqual([]);
  });

  test("payload sem event retorna []", () => {
    expect(parseWebhook({})).toEqual([]);
  });

  test("event desconhecido retorna []", () => {
    expect(parseWebhook({ event: "foo", instance: "x", data: {} })).toEqual([]);
  });

  test("connection.update retorna [] (tratado fora do parseWebhook)", () => {
    expect(parseWebhook({ event: "connection.update", instance: "x", data: { state: "open" } })).toEqual([]);
  });

  test("messages.upsert sem data.key.id retorna []", () => {
    expect(
      parseWebhook({ event: "messages.upsert", instance: "x", data: { message: { conversation: "x" } } }),
    ).toEqual([]);
  });
});
