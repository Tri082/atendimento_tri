import { randomUUID } from "node:crypto";
import type {
  MessagingAdapter,
  NormalizedEvent,
  SendMessageOpts,
  SendTemplateOpts,
  VerifyWebhookRequest,
} from "../adapter";
import { registerAdapter } from "../registry";

let sentCounter = 0;

function fakeExternalId(): string {
  sentCounter += 1;
  return `mock_${sentCounter}_${randomUUID().slice(0, 8)}`;
}

interface MockEventPayload {
  kind: "message" | "status" | "reaction";
  externalThreadId: string;
  externalMessageId: string;
  timestamp?: string;
  body?: string;
  media?: { url: string; mimeType: string; size?: number }[];
  status?: "sent" | "delivered" | "read" | "failed";
  failureReason?: string;
  emoji?: string;
  targetExternalMessageId?: string;
}

function isMockPayload(p: unknown): p is { events: MockEventPayload[] } {
  return typeof p === "object" && p !== null && Array.isArray((p as { events?: unknown }).events);
}

export const mockAdapter: MessagingAdapter = {
  channel: "mock",
  capabilities: { templates: true, reactions: false, readReceipts: true, media: true },

  validateConfig(config) {
    if (typeof config !== "object" || config === null) {
      return { ok: false, error: "config deve ser objeto" };
    }
    return { ok: true, config };
  },

  async sendMessage(_cfg: unknown, _opts: SendMessageOpts) {
    return { externalId: fakeExternalId() };
  },

  async sendTemplate(_cfg: unknown, _opts: SendTemplateOpts) {
    return { externalId: fakeExternalId() };
  },

  verifyWebhook(_req: VerifyWebhookRequest) {
    return true;
  },

  parseWebhook(payload: unknown): NormalizedEvent[] {
    if (!isMockPayload(payload)) return [];
    const now = new Date().toISOString();
    return payload.events.map(
      (e): NormalizedEvent => ({
        kind: e.kind,
        externalThreadId: e.externalThreadId,
        externalMessageId: e.externalMessageId,
        timestamp: e.timestamp ?? now,
        message: e.kind === "message" ? { body: e.body, media: e.media } : undefined,
        status:
          e.kind === "status" && e.status
            ? { value: e.status, failureReason: e.failureReason }
            : undefined,
        reaction:
          e.kind === "reaction" && e.emoji && e.targetExternalMessageId
            ? { emoji: e.emoji, targetExternalMessageId: e.targetExternalMessageId }
            : undefined,
        raw: e,
      }),
    );
  },
};

// Auto-registra no import
registerAdapter(mockAdapter);

/** APENAS pra testes */
export function __resetMockState(): void {
  sentCounter = 0;
}
