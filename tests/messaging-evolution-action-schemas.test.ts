import { describe, expect, test } from "vitest";
import {
  connectEvolutionInputSchema,
  disconnectEvolutionInputSchema,
  reverifyEvolutionInputSchema,
  testSendEvolutionInputSchema,
} from "@/lib/messaging/adapters/whatsapp-evolution/action-schemas";

const UID = "11111111-1111-1111-1111-111111111111";

describe("connectEvolutionInputSchema", () => {
  test("aceita input válido", () => {
    expect(
      connectEvolutionInputSchema.safeParse({
        orgSlug: "minha-org",
        baseUrl: "https://evo.exemplo.com",
        apiKey: "sk_test_1234567890",
        instanceName: "minha-empresa",
        displayName: "WhatsApp Comercial",
      }).success,
    ).toBe(true);
  });

  test("rejeita baseUrl não-URL", () => {
    expect(
      connectEvolutionInputSchema.safeParse({
        orgSlug: "x",
        baseUrl: "nope",
        apiKey: "sk_1234567890",
        instanceName: "x",
        displayName: "x",
      }).success,
    ).toBe(false);
  });

  test("rejeita displayName vazio", () => {
    expect(
      connectEvolutionInputSchema.safeParse({
        orgSlug: "x",
        baseUrl: "https://x.com",
        apiKey: "sk_1234567890",
        instanceName: "x",
        displayName: "",
      }).success,
    ).toBe(false);
  });
});

describe("disconnectEvolutionInputSchema", () => {
  test("aceita channelId UUID", () => {
    expect(disconnectEvolutionInputSchema.safeParse({ orgSlug: "x", channelId: UID }).success).toBe(true);
  });
  test("rejeita channelId não-UUID", () => {
    expect(disconnectEvolutionInputSchema.safeParse({ orgSlug: "x", channelId: "nope" }).success).toBe(false);
  });
});

describe("reverifyEvolutionInputSchema", () => {
  test("aceita channelId UUID", () => {
    expect(reverifyEvolutionInputSchema.safeParse({ orgSlug: "x", channelId: UID }).success).toBe(true);
  });
});

describe("testSendEvolutionInputSchema", () => {
  test("aceita input válido", () => {
    expect(
      testSendEvolutionInputSchema.safeParse({
        orgSlug: "x",
        channelId: UID,
        to: "+5511999990000",
        body: "Teste",
      }).success,
    ).toBe(true);
  });
  test("rejeita body vazio", () => {
    expect(
      testSendEvolutionInputSchema.safeParse({
        orgSlug: "x",
        channelId: UID,
        to: "+5511999990000",
        body: "",
      }).success,
    ).toBe(false);
  });
});
