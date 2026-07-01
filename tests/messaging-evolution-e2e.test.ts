// Integration test — exige Evolution real rodando + creds no env.
// Auto-skip se faltarem env vars.
import { describe, expect, it } from "vitest";

const HAS_EVOLUTION = Boolean(
  process.env.EVOLUTION_BASE_URL &&
    process.env.EVOLUTION_API_KEY &&
    process.env.EVOLUTION_TEST_INSTANCE,
);

describe.skipIf(!HAS_EVOLUTION)("Evolution E2E", () => {
  const baseUrl = process.env.EVOLUTION_BASE_URL!;
  const apiKey = process.env.EVOLUTION_API_KEY!;
  const instanceName = process.env.EVOLUTION_TEST_INSTANCE!;

  it("connectionState retorna estado válido", async () => {
    const { getJson } = await import("@/lib/messaging/adapters/whatsapp-evolution/client");
    const data = await getJson<{ instance?: { state?: string }; state?: string }>(
      `${baseUrl}/instance/connectionState/${instanceName}`,
      apiKey,
    );
    const state = data.instance?.state ?? data.state;
    expect(["open", "close", "connecting"]).toContain(state);
  }, 30_000);

  it("test-send via adapter (se EVOLUTION_TEST_NUMBER setado)", async () => {
    if (!process.env.EVOLUTION_TEST_NUMBER) {
      console.log("Skip test-send — EVOLUTION_TEST_NUMBER não setado");
      return;
    }
    const { evolutionAdapter } = await import(
      "@/lib/messaging/adapters/whatsapp-evolution/adapter"
    );
    const config = {
      baseUrl,
      apiKey,
      instanceName,
      webhookSecret: "a".repeat(32),
    };
    const result = await evolutionAdapter.sendMessage(config, {
      to: process.env.EVOLUTION_TEST_NUMBER!,
      body: `Teste E2E ${new Date().toISOString()}`,
    });
    expect(result.externalId).toBeTruthy();
  }, 30_000);
});
