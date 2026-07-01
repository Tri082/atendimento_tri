"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  connectEvolutionInputSchema,
  disconnectEvolutionInputSchema,
  reverifyEvolutionInputSchema,
  testSendEvolutionInputSchema,
  type ConnectEvolutionInput,
  type DisconnectEvolutionInput,
  type ReverifyEvolutionInput,
  type TestSendEvolutionInput,
} from "./action-schemas";
import { evolutionAdapter } from "./adapter";
import { getJson, postJson } from "./client";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL não configurada — pra webhook funcionar.");
  return url.startsWith("http") ? url : `https://${url}`;
}

async function fetchInstanceState(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<{ state: string; ownerJid: string | null }> {
  const data = await getJson<{
    instance?: { state?: string; owner?: string };
    state?: string;
  }>(`${baseUrl}/instance/connectionState/${instanceName}`, apiKey);
  const state = data.instance?.state ?? data.state ?? "unknown";
  const ownerJid = data.instance?.owner ?? null;
  return { state, ownerJid };
}

async function setWebhook(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string,
  webhookSecret: string,
): Promise<void> {
  await postJson(`${baseUrl}/webhook/set/${instanceName}`, apiKey, {
    webhook: {
      enabled: true,
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      headers: { Authorization: `Bearer ${webhookSecret}` },
      events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
    },
  });
}

export async function connectEvolutionChannelAction(
  input: ConnectEvolutionInput,
): Promise<Result<{ channelId: string }>> {
  const parsed = connectEvolutionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { user, org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const { baseUrl, apiKey, instanceName, displayName } = parsed.data;

  let state: string;
  let ownerJid: string | null;
  try {
    const r = await fetchInstanceState(baseUrl, apiKey, instanceName);
    state = r.state;
    ownerJid = r.ownerJid;
  } catch (err) {
    logError("evolution.connect.state", err);
    return { ok: false, error: err instanceof Error ? err.message : "Não foi possível contatar o Evolution." };
  }
  if (state !== "open") {
    return {
      ok: false,
      error:
        "Instância existe mas não está conectada (estado: " +
        state +
        "). Volte no Evolution e escaneie o QR code primeiro.",
    };
  }

  const webhookSecret = crypto.randomBytes(32).toString("hex");
  const webhookUrl = `${appUrl()}/api/webhooks/messaging/whatsapp_evolution`;
  try {
    await setWebhook(baseUrl, apiKey, instanceName, webhookUrl, webhookSecret);
  } catch (err) {
    logError("evolution.connect.webhook", err);
    return { ok: false, error: "Não foi possível configurar o webhook no Evolution." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .insert({
      organization_id: org.id,
      type: "whatsapp_evolution",
      name: displayName,
      status: "connected",
      external_id: instanceName,
      created_by: user.id,
      config: {
        baseUrl,
        apiKey,
        instanceName,
        webhookSecret,
        connectedNumber: ownerJid,
      },
    })
    .select("id")
    .single();
  if (error || !data) {
    logError("evolution.connect.insert", error);
    return { ok: false, error: "Não foi possível salvar o canal." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/settings/channels`);
  return { ok: true, data: { channelId: data.id } };
}

export async function reverifyEvolutionChannelAction(
  input: ReverifyEvolutionInput,
): Promise<Result> {
  const parsed = reverifyEvolutionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("id, config")
    .eq("id", parsed.data.channelId)
    .eq("organization_id", org.id)
    .eq("type", "whatsapp_evolution")
    .maybeSingle();
  if (!channel) return { ok: false, error: "Canal não encontrado." };

  const cfg = channel.config as {
    baseUrl: string;
    apiKey: string;
    instanceName: string;
    webhookSecret?: string;
    connectedNumber?: string | null;
  };

  let state: string;
  let ownerJid: string | null;
  try {
    const r = await fetchInstanceState(cfg.baseUrl, cfg.apiKey, cfg.instanceName);
    state = r.state;
    ownerJid = r.ownerJid;
  } catch (err) {
    logError("evolution.reverify.state", err);
    return { ok: false, error: err instanceof Error ? err.message : "Não foi possível contatar o Evolution." };
  }

  const newSecret = crypto.randomBytes(32).toString("hex");
  try {
    await setWebhook(
      cfg.baseUrl,
      cfg.apiKey,
      cfg.instanceName,
      `${appUrl()}/api/webhooks/messaging/whatsapp_evolution`,
      newSecret,
    );
  } catch (err) {
    logError("evolution.reverify.webhook", err);
    return { ok: false, error: "Não foi possível reconfigurar o webhook." };
  }

  const newStatus = state === "open" ? "connected" : "error";
  const lastError = state === "open" ? null : "Instância não está conectada no Evolution.";
  await supabase
    .from("channels")
    .update({
      status: newStatus,
      last_error: lastError,
      config: { ...cfg, webhookSecret: newSecret, connectedNumber: ownerJid },
    })
    .eq("id", channel.id);

  revalidatePath(`/app/${parsed.data.orgSlug}/settings/channels/whatsapp-evolution/${channel.id}`);
  return { ok: true };
}

export async function disconnectEvolutionChannelAction(
  input: DisconnectEvolutionInput,
): Promise<Result> {
  const parsed = disconnectEvolutionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const { error } = await supabase
    .from("channels")
    .delete()
    .eq("id", parsed.data.channelId)
    .eq("organization_id", org.id)
    .eq("type", "whatsapp_evolution");
  if (error) {
    logError("evolution.disconnect", error);
    return { ok: false, error: "Não foi possível desconectar o canal." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/channels`);
  return { ok: true };
}

export async function testSendEvolutionAction(
  input: TestSendEvolutionInput,
): Promise<Result<{ externalId: string }>> {
  const parsed = testSendEvolutionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("config")
    .eq("id", parsed.data.channelId)
    .eq("organization_id", org.id)
    .eq("type", "whatsapp_evolution")
    .maybeSingle();
  if (!channel) return { ok: false, error: "Canal não encontrado." };

  try {
    const result = await evolutionAdapter.sendMessage(channel.config, {
      to: parsed.data.to,
      body: parsed.data.body,
    });
    return { ok: true, data: { externalId: result.externalId } };
  } catch (err) {
    logError("evolution.test-send", err);
    return { ok: false, error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
