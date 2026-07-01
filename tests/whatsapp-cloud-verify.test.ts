import crypto from "node:crypto";
import { describe, expect, test } from "vitest";
import { whatsappCloudAdapter } from "@/lib/messaging/adapters/whatsapp-cloud/adapter";

const APP_SECRET = "a".repeat(32);
const CONFIG = {
  phoneNumberId: "123456789012345",
  wabaId: "987654321098765",
  accessToken: "EAAB" + "x".repeat(50),
  appSecret: APP_SECRET,
  verifyToken: "11111111-1111-1111-1111-111111111111",
  apiVersion: "v22.0",
};

function signature(body: string, secret: string) {
  return (
    "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex")
  );
}

describe("whatsappCloudAdapter.verifyWebhook", () => {
  test("HMAC válida → true", () => {
    const body = JSON.stringify({ entry: [] });
    const ok = whatsappCloudAdapter.verifyWebhook(
      {
        headers: { "x-hub-signature-256": signature(body, APP_SECRET) },
        rawBody: Buffer.from(body),
        query: {},
      },
      CONFIG,
    );
    expect(ok).toBe(true);
  });

  test("HMAC com secret errado → false", () => {
    const body = JSON.stringify({ entry: [] });
    const ok = whatsappCloudAdapter.verifyWebhook(
      {
        headers: { "x-hub-signature-256": signature(body, "wrong-secret-".repeat(3)) },
        rawBody: Buffer.from(body),
        query: {},
      },
      CONFIG,
    );
    expect(ok).toBe(false);
  });

  test("sem assinatura → false", () => {
    const ok = whatsappCloudAdapter.verifyWebhook(
      { headers: {}, rawBody: Buffer.from("{}"), query: {} },
      CONFIG,
    );
    expect(ok).toBe(false);
  });

  test("sem channelConfig → false", () => {
    const ok = whatsappCloudAdapter.verifyWebhook(
      {
        headers: { "x-hub-signature-256": "sha256=abc" },
        rawBody: Buffer.from("{}"),
        query: {},
      },
      undefined,
    );
    expect(ok).toBe(false);
  });
});

describe("whatsappCloudAdapter.validateConfig", () => {
  test("config válida → { ok: true }", () => {
    const r = whatsappCloudAdapter.validateConfig(CONFIG);
    expect(r.ok).toBe(true);
  });

  test("config inválida → { ok: false, error }", () => {
    const r = whatsappCloudAdapter.validateConfig({ phoneNumberId: "abc" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeTruthy();
  });
});

describe("whatsappCloudAdapter.channel/capabilities", () => {
  test("channel = whatsapp_cloud", () => {
    expect(whatsappCloudAdapter.channel).toBe("whatsapp_cloud");
  });

  test("capabilities expostas", () => {
    expect(whatsappCloudAdapter.capabilities).toEqual({
      templates: true,
      reactions: true,
      readReceipts: true,
      media: true,
    });
  });
});
