import { describe, expect, test } from "vitest";
import { parseWebhook } from "@/lib/messaging/adapters/whatsapp-cloud/parse-webhook";

const PNI = "123456789";

function metaWebhookWith(value: unknown) {
  return {
    object: "whatsapp_business_account",
    entry: [{ id: "waba", changes: [{ field: "messages", value }] }],
  };
}

describe("parseWebhook", () => {
  test("payload inválido retorna []", () => {
    expect(parseWebhook({})).toEqual([]);
    expect(parseWebhook(null)).toEqual([]);
    expect(parseWebhook("string")).toEqual([]);
  });

  test("text message → 1 event kind=message", () => {
    const events = parseWebhook(
      metaWebhookWith({
        metadata: { phone_number_id: PNI },
        messages: [
          {
            from: "5511987654321",
            id: "wamid.ABC",
            type: "text",
            text: { body: "Oi" },
            timestamp: "1700000000",
          },
        ],
      }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "message",
      externalThreadId: "+5511987654321",
      externalMessageId: "wamid.ABC",
      message: { body: "Oi" },
    });
    expect((events[0]!.raw as { phoneNumberId?: string }).phoneNumberId).toBe(PNI);
  });

  test("image message → media com externalMediaId", () => {
    const events = parseWebhook(
      metaWebhookWith({
        metadata: { phone_number_id: PNI },
        messages: [
          {
            from: "5511987654321",
            id: "wamid.IMG",
            type: "image",
            image: { id: "media-1", mime_type: "image/jpeg", caption: "Foto" },
            timestamp: "1700000001",
          },
        ],
      }),
    );
    expect(events[0]?.message?.body).toBe("Foto");
    expect(events[0]?.message?.media?.[0]?.externalMediaId).toBe("media-1");
  });

  test("status delivered → 1 event kind=status", () => {
    const events = parseWebhook(
      metaWebhookWith({
        metadata: { phone_number_id: PNI },
        statuses: [
          {
            id: "wamid.X",
            status: "delivered",
            recipient_id: "5511987654321",
            timestamp: "1700000002",
          },
        ],
      }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "status",
      externalMessageId: "wamid.X",
      status: { value: "delivered" },
    });
  });

  test("status failed inclui failureReason", () => {
    const events = parseWebhook(
      metaWebhookWith({
        metadata: { phone_number_id: PNI },
        statuses: [
          {
            id: "wamid.F",
            status: "failed",
            recipient_id: "5511987654321",
            timestamp: "1700000003",
            errors: [{ code: 131026, title: "Recipient not opted in" }],
          },
        ],
      }),
    );
    expect(events[0]?.status).toMatchObject({
      value: "failed",
      failureReason: "Recipient not opted in",
    });
  });

  test("messages + statuses no mesmo payload geram múltiplos events", () => {
    const events = parseWebhook(
      metaWebhookWith({
        metadata: { phone_number_id: PNI },
        messages: [
          { from: "5511987654321", id: "wamid.M", type: "text", text: { body: "x" }, timestamp: "1700000010" },
        ],
        statuses: [
          { id: "wamid.S", status: "read", recipient_id: "5511987654321", timestamp: "1700000011" },
        ],
      }),
    );
    expect(events).toHaveLength(2);
    expect(events[0]!.kind).toBe("message");
    expect(events[1]!.kind).toBe("status");
  });

  test("change.field !== 'messages' é ignorado", () => {
    const events = parseWebhook({
      object: "whatsapp_business_account",
      entry: [{ id: "x", changes: [{ field: "account_review_update", value: {} }] }],
    });
    expect(events).toEqual([]);
  });

  test("status com sent (não failed) sem errors", () => {
    const events = parseWebhook(
      metaWebhookWith({
        metadata: { phone_number_id: PNI },
        statuses: [
          { id: "wamid.S", status: "sent", recipient_id: "5511987654321", timestamp: "1700000020" },
        ],
      }),
    );
    expect(events[0]?.status?.value).toBe("sent");
    expect(events[0]?.status?.failureReason).toBeUndefined();
  });
});
