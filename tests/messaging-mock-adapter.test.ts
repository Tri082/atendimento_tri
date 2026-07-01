import { beforeEach, describe, expect, test } from "vitest";
import { __resetMockState, mockAdapter } from "@/lib/messaging/adapters/mock";

describe("mockAdapter", () => {
  beforeEach(() => __resetMockState());

  test("capabilities exposem flags esperadas", () => {
    expect(mockAdapter.channel).toBe("mock");
    expect(mockAdapter.capabilities).toEqual({
      templates: true,
      reactions: false,
      readReceipts: true,
      media: true,
    });
  });

  test("validateConfig aceita qualquer objeto", () => {
    expect(mockAdapter.validateConfig({})).toEqual({ ok: true, config: {} });
    expect(mockAdapter.validateConfig({ foo: "bar" })).toEqual({
      ok: true,
      config: { foo: "bar" },
    });
  });

  test("sendMessage retorna externalId previsível", async () => {
    const r = await mockAdapter.sendMessage({}, { to: "+5511987654321", body: "Oi" });
    expect(r.externalId).toMatch(/^mock_/);
  });

  test("sendTemplate retorna externalId", async () => {
    const r = await mockAdapter.sendTemplate(
      {},
      {
        to: "+5511987654321",
        templateName: "boas_vindas",
        language: "pt_BR",
        params: { nome: "João" },
      },
    );
    expect(r).toMatchObject({ externalId: expect.stringMatching(/^mock_/) });
  });

  test("verifyWebhook sempre true (sem assinatura no mock)", () => {
    expect(mockAdapter.verifyWebhook({ headers: {}, rawBody: Buffer.from(""), query: {} })).toBe(
      true,
    );
  });

  test("parseWebhook converte payload de teste em NormalizedEvent[]", () => {
    const payload = {
      events: [
        {
          kind: "message",
          externalThreadId: "+5511987654321",
          externalMessageId: "ext-1",
          body: "Olá",
        },
      ],
    };
    const events = mockAdapter.parseWebhook(payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "message",
      externalThreadId: "+5511987654321",
      externalMessageId: "ext-1",
      message: { body: "Olá" },
    });
  });

  test("parseWebhook payload status", () => {
    const events = mockAdapter.parseWebhook({
      events: [
        {
          kind: "status",
          externalThreadId: "+5511987654321",
          externalMessageId: "ext-1",
          status: "delivered",
        },
      ],
    });
    expect(events[0]?.kind).toBe("status");
    expect(events[0]?.status?.value).toBe("delivered");
  });

  test("parseWebhook payload inválido retorna []", () => {
    expect(mockAdapter.parseWebhook({})).toEqual([]);
    expect(mockAdapter.parseWebhook(null)).toEqual([]);
    expect(mockAdapter.parseWebhook("string")).toEqual([]);
  });
});
