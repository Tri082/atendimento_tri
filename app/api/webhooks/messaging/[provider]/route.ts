import { after, NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import "@/lib/messaging";
import type { ChannelType } from "@/lib/messaging/adapter";
import { getAdapter, hasAdapter } from "@/lib/messaging/registry";
import { processWebhook } from "@/lib/messaging/webhooks";

const VALID_PROVIDERS: ChannelType[] = [
  "whatsapp_cloud",
  "whatsapp_evolution",
  "telegram",
  "instagram_dm",
  "sms",
  "mock",
];

function isChannelType(s: string): s is ChannelType {
  return VALID_PROVIDERS.includes(s as ChannelType);
}

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;

  if (!isChannelType(provider) || !hasAdapter(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }

  const adapter = getAdapter(provider);
  const rawBodyText = await req.text();
  const rawBody = Buffer.from(rawBodyText, "utf8");

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });

  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });

  // Pra WhatsApp, precisa do appSecret/webhookSecret do channel pra verificar.
  // Webhook request NÃO tem cookie de sessão → o cliente SSR cai em anônimo
  // e RLS bloqueia a leitura de `channels`. Usa service client (bypassa RLS)
  // — bearer/HMAC do próprio webhook autentica a request.
  let channelConfig: unknown = undefined;
  if (provider === "whatsapp_cloud") {
    const phoneNumberId = extractWhatsappPhoneNumberId(rawBodyText);
    if (phoneNumberId) {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("channels")
        .select("config")
        .eq("type", "whatsapp_cloud")
        .eq("external_id", phoneNumberId)
        .maybeSingle();
      channelConfig = data?.config;
    }
  } else if (provider === "whatsapp_evolution") {
    const instanceName = extractEvolutionInstanceName(rawBodyText);
    if (instanceName) {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("channels")
        .select("config")
        .eq("type", "whatsapp_evolution")
        .eq("external_id", instanceName)
        .maybeSingle();
      channelConfig = data?.config;
    }
  }

  const verified = adapter.verifyWebhook({ headers, rawBody, query }, channelConfig);
  if (!verified) {
    logError("messaging.webhook", {
      code: "verify_failed",
      message: `provider=${provider}`,
    });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBodyText);
  } catch {
    payload = rawBodyText;
  }

  // Sub-G: Evolution emite connection.update fora do parseWebhook normal
  if (provider === "whatsapp_evolution") {
    const evt = (payload as { event?: string } | null)?.event;
    if (evt === "connection.update") {
      const { handleConnectionUpdate } = await import(
        "@/lib/messaging/adapters/whatsapp-evolution/connection-update"
      );
      const data = (payload as { instance?: string; data?: { state?: string } }) ?? {};
      after(() => handleConnectionUpdate(data.instance ?? "", data.data?.state ?? "unknown"));
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  }

  after(() => processWebhook(adapter, payload));

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  if (!isChannelType(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = url.searchParams.get("hub.verify_token");

  if (mode !== "subscribe" || !challenge) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Mock: echo cego (testes locais).
  if (provider === "mock") {
    return new Response(challenge, { status: 200 });
  }

  // WhatsApp: busca canal pelo verifyToken (multi-tenant: cada org tem o seu).
  if (provider === "whatsapp_cloud") {
    if (!verifyToken) {
      return NextResponse.json({ error: "missing verify_token" }, { status: 401 });
    }
    // Sem cookie de sessão (handshake da Meta) — usa service client.
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("channels")
      .select("id")
      .eq("type", "whatsapp_cloud")
      .filter("config->>verifyToken", "eq", verifyToken)
      .maybeSingle();
    if (!data) {
      logError("messaging.webhook.verify-get", {
        code: "verify_token_mismatch",
        message: "no channel matches the provided verify_token",
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return new Response(challenge, { status: 200 });
  }

  // Outros providers (telegram, instagram, sms): echo padrão (foundation behavior).
  return new Response(challenge, { status: 200 });
}

function extractWhatsappPhoneNumberId(rawBodyText: string): string | null {
  try {
    const payload = JSON.parse(rawBodyText);
    return (
      payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? null
    );
  } catch {
    return null;
  }
}

function extractEvolutionInstanceName(rawBodyText: string): string | null {
  try {
    const payload = JSON.parse(rawBodyText);
    return typeof payload?.instance === "string" ? payload.instance : null;
  } catch {
    return null;
  }
}
