import type { NormalizedEvent } from "@/lib/messaging/adapter";
import { extractMessageContent } from "./extract-message";

interface MetaWebhookValue {
  metadata?: { phone_number_id?: string };
  messages?: Array<{
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body?: string };
    image?: { id?: string; mime_type?: string; caption?: string };
    document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
    audio?: { id?: string; mime_type?: string };
    video?: { id?: string; mime_type?: string; caption?: string };
    sticker?: { id?: string; mime_type?: string };
    context?: { id?: string };
  }>;
  statuses?: Array<{
    id: string;
    status: string;
    recipient_id?: string;
    timestamp: string;
    errors?: Array<{ code?: number; title?: string; message?: string }>;
  }>;
}

interface MetaWebhook {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{ field?: string; value?: MetaWebhookValue }>;
  }>;
}

function isMetaWebhook(p: unknown): p is MetaWebhook {
  return typeof p === "object" && p !== null && Array.isArray((p as MetaWebhook).entry);
}

export function parseWebhook(payload: unknown): NormalizedEvent[] {
  if (!isMetaWebhook(payload)) return [];
  const events: NormalizedEvent[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const v = change.value;
      if (!v) continue;
      const phoneNumberId = v.metadata?.phone_number_id;

      for (const m of v.messages ?? []) {
        const content = extractMessageContent(m);
        events.push({
          kind: "message",
          externalThreadId: `+${m.from}`,
          externalMessageId: m.id,
          timestamp: new Date(Number(m.timestamp) * 1000).toISOString(),
          message: {
            ...content,
            replyToExternalId: m.context?.id,
          },
          raw: { ...m, phoneNumberId },
        });
      }

      for (const s of v.statuses ?? []) {
        const okStatus = ["sent", "delivered", "read", "failed"].includes(s.status);
        if (!okStatus) continue;
        events.push({
          kind: "status",
          externalThreadId: `+${s.recipient_id ?? ""}`,
          externalMessageId: s.id,
          timestamp: new Date(Number(s.timestamp) * 1000).toISOString(),
          status:
            s.status === "failed"
              ? { value: "failed", failureReason: s.errors?.[0]?.title ?? s.errors?.[0]?.message }
              : { value: s.status as "sent" | "delivered" | "read" },
          raw: { ...s, phoneNumberId },
        });
      }
    }
  }

  return events;
}
