import { describe, expect, test } from "vitest";
import { evolutionConfigSchema } from "@/lib/messaging/adapters/whatsapp-evolution/schema";

const VALID = {
  baseUrl: "https://evo.exemplo.com",
  apiKey: "sk_test_1234567890abcdef",
  instanceName: "minha-empresa",
  webhookSecret: "a".repeat(32),
};

describe("evolutionConfigSchema", () => {
  test("aceita config válida", () => {
    expect(evolutionConfigSchema.safeParse(VALID).success).toBe(true);
  });

  test("rejeita baseUrl não-URL", () => {
    expect(evolutionConfigSchema.safeParse({ ...VALID, baseUrl: "nope" }).success).toBe(false);
  });

  test("rejeita apiKey muito curta (<10 chars)", () => {
    expect(evolutionConfigSchema.safeParse({ ...VALID, apiKey: "abc" }).success).toBe(false);
  });

  test("rejeita instanceName vazio", () => {
    expect(evolutionConfigSchema.safeParse({ ...VALID, instanceName: "" }).success).toBe(false);
  });

  test("rejeita webhookSecret <16 chars", () => {
    expect(evolutionConfigSchema.safeParse({ ...VALID, webhookSecret: "short" }).success).toBe(false);
  });

  test("aceita connectedNumber opcional", () => {
    expect(evolutionConfigSchema.safeParse({ ...VALID, connectedNumber: "+5511999990000" }).success).toBe(true);
    expect(evolutionConfigSchema.safeParse({ ...VALID, connectedNumber: null }).success).toBe(true);
  });

  test("rejeita instanceName >80 chars", () => {
    expect(evolutionConfigSchema.safeParse({ ...VALID, instanceName: "a".repeat(81) }).success).toBe(false);
  });
});
