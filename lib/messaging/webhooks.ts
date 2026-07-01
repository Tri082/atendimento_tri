import { logError } from "@/lib/logger";
import type { MessagingAdapter } from "./adapter";
import { processInboundMessage, processStatusUpdate } from "./router";

/**
 * Despacha um payload de webhook já verificado pra função do router correta.
 * Chamada via after() após o handler responder 200 OK.
 */
export async function processWebhook(adapter: MessagingAdapter, payload: unknown): Promise<void> {
  let events: ReturnType<MessagingAdapter["parseWebhook"]> = [];
  try {
    events = adapter.parseWebhook(payload);
  } catch (err) {
    logError("messaging.webhook.parse", err);
    return;
  }

  for (const ev of events) {
    try {
      if (ev.kind === "message") {
        await processInboundMessage(adapter.channel, ev);
      } else if (ev.kind === "status") {
        await processStatusUpdate(adapter.channel, ev);
      }
      // reactions são ignoradas na foundation (Sub-projeto C decide UX)
    } catch (err) {
      logError(`messaging.webhook.${ev.kind}`, err);
    }
  }
}
