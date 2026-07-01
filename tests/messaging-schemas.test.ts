import { describe, expect, test } from "vitest";
import {
  connectChannelSchema,
  sendMessageSchema,
  sendTemplateSchema,
} from "@/lib/messaging/schemas";

const UUID = "11111111-1111-1111-1111-111111111111";

describe("sendMessageSchema", () => {
  test("aceita texto puro", () => {
    const r = sendMessageSchema.safeParse({
      orgSlug: "acme",
      conversationId: UUID,
      body: "Oi",
    });
    expect(r.success).toBe(true);
  });

  test("aceita mídia sem texto", () => {
    const r = sendMessageSchema.safeParse({
      orgSlug: "acme",
      conversationId: UUID,
      media: [{ url: "https://x/y.jpg", mimeType: "image/jpeg" }],
    });
    expect(r.success).toBe(true);
  });

  test("rejeita sem body e sem media", () => {
    const r = sendMessageSchema.safeParse({
      orgSlug: "acme",
      conversationId: UUID,
    });
    expect(r.success).toBe(false);
  });

  test("rejeita conversationId não-uuid", () => {
    const r = sendMessageSchema.safeParse({
      orgSlug: "acme",
      conversationId: "not-uuid",
      body: "x",
    });
    expect(r.success).toBe(false);
  });

  test("rejeita body > 4096 chars", () => {
    const r = sendMessageSchema.safeParse({
      orgSlug: "acme",
      conversationId: UUID,
      body: "a".repeat(4097),
    });
    expect(r.success).toBe(false);
  });
});

describe("sendTemplateSchema", () => {
  test("aceita template com params", () => {
    const r = sendTemplateSchema.safeParse({
      orgSlug: "acme",
      conversationId: UUID,
      templateName: "boas_vindas",
      language: "pt_BR",
      params: { nome: "João" },
    });
    expect(r.success).toBe(true);
  });

  test("aceita params vazio", () => {
    const r = sendTemplateSchema.safeParse({
      orgSlug: "acme",
      conversationId: UUID,
      templateName: "agendamento",
      language: "pt_BR",
      params: {},
    });
    expect(r.success).toBe(true);
  });

  test("rejeita templateName vazio", () => {
    const r = sendTemplateSchema.safeParse({
      orgSlug: "acme",
      conversationId: UUID,
      templateName: "",
      language: "pt_BR",
      params: {},
    });
    expect(r.success).toBe(false);
  });
});

describe("connectChannelSchema", () => {
  test("aceita whatsapp_cloud com config válida", () => {
    const r = connectChannelSchema.safeParse({
      orgSlug: "acme",
      type: "whatsapp_cloud",
      name: "WhatsApp Vendas",
      config: { phoneNumberId: "123", accessToken: "EAAB...", appSecret: "secret" },
    });
    expect(r.success).toBe(true);
  });

  test("rejeita type fora do enum", () => {
    const r = connectChannelSchema.safeParse({
      orgSlug: "acme",
      type: "email",
      name: "x",
      config: {},
    });
    expect(r.success).toBe(false);
  });

  test("rejeita name vazio", () => {
    const r = connectChannelSchema.safeParse({
      orgSlug: "acme",
      type: "mock",
      name: "",
      config: {},
    });
    expect(r.success).toBe(false);
  });
});
