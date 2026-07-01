import { describe, expect, test } from "vitest";
import { whatsappCloudConfigSchema } from "@/lib/messaging/adapters/whatsapp-cloud/schema";

const VALID = {
  phoneNumberId: "123456789012345",
  wabaId: "987654321098765",
  accessToken: "EAAB" + "x".repeat(50),
  appSecret: "a".repeat(32),
  verifyToken: "11111111-1111-1111-1111-111111111111",
};

describe("whatsappCloudConfigSchema", () => {
  test("aceita config válida com apiVersion default", () => {
    const r = whatsappCloudConfigSchema.safeParse(VALID);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.apiVersion).toBe("v22.0");
  });

  test("aceita config com apiVersion explícita", () => {
    const r = whatsappCloudConfigSchema.safeParse({ ...VALID, apiVersion: "v23.0" });
    expect(r.success).toBe(true);
  });

  test("rejeita phoneNumberId não-numérico", () => {
    const r = whatsappCloudConfigSchema.safeParse({ ...VALID, phoneNumberId: "abc" });
    expect(r.success).toBe(false);
  });

  test("rejeita wabaId vazio", () => {
    const r = whatsappCloudConfigSchema.safeParse({ ...VALID, wabaId: "" });
    expect(r.success).toBe(false);
  });

  test("rejeita accessToken muito curto", () => {
    const r = whatsappCloudConfigSchema.safeParse({ ...VALID, accessToken: "abc" });
    expect(r.success).toBe(false);
  });

  test("rejeita appSecret muito curto", () => {
    const r = whatsappCloudConfigSchema.safeParse({ ...VALID, appSecret: "abc" });
    expect(r.success).toBe(false);
  });

  test("rejeita verifyToken não-UUID", () => {
    const r = whatsappCloudConfigSchema.safeParse({ ...VALID, verifyToken: "not-a-uuid" });
    expect(r.success).toBe(false);
  });
});
