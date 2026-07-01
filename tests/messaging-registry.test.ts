import { beforeEach, describe, expect, test } from "vitest";
import type { MessagingAdapter } from "@/lib/messaging/adapter";
import { __resetRegistry, getAdapter, hasAdapter, registerAdapter } from "@/lib/messaging/registry";

function makeFakeAdapter(channel: MessagingAdapter["channel"]): MessagingAdapter {
  return {
    channel,
    capabilities: { templates: false, reactions: false, readReceipts: false, media: false },
    validateConfig: () => ({ ok: true, config: {} }),
    sendMessage: async () => ({ externalId: "x" }),
    sendTemplate: async () => ({ unsupported: true }),
    verifyWebhook: () => true,
    parseWebhook: () => [],
  };
}

describe("messaging registry", () => {
  beforeEach(() => __resetRegistry());

  test("registra e recupera adapter", () => {
    const a = makeFakeAdapter("mock");
    registerAdapter(a);
    expect(getAdapter("mock")).toBe(a);
  });

  test("hasAdapter retorna false quando não registrado", () => {
    expect(hasAdapter("telegram")).toBe(false);
  });

  test("getAdapter lança erro quando não registrado", () => {
    expect(() => getAdapter("telegram")).toThrow(/não registrado/);
  });

  test("re-registrar substitui adapter anterior", () => {
    const a1 = makeFakeAdapter("mock");
    const a2 = makeFakeAdapter("mock");
    registerAdapter(a1);
    registerAdapter(a2);
    expect(getAdapter("mock")).toBe(a2);
  });
});
