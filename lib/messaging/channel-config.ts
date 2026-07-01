import { requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Lê `channels.config` (que contém tokens sensíveis).
 *
 * Único caminho permitido pra acessar config de um canal. Exige role
 * owner/admin. Nunca expor pro browser — esse helper SÓ deve ser
 * chamado em Server Actions / route handlers de webhook.
 */
export async function getChannelConfig(opts: {
  channelId: string;
  orgSlug: string;
}): Promise<Record<string, unknown> | null> {
  const { org } = await requireOrgRole({
    orgSlug: opts.orgSlug,
    roles: ["owner", "admin"],
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select("organization_id, config")
    .eq("id", opts.channelId)
    .maybeSingle();

  if (error) {
    logError("messaging.channel-config", error);
    return null;
  }
  if (!data) return null;

  // Defesa em profundidade: confirma que channel é da org indicada,
  // independente de RLS. Se chegou diferente, algo está MUITO errado.
  if (data.organization_id !== org.id) {
    logError("messaging.channel-config", {
      code: "org_mismatch",
      message: `channel ${opts.channelId} pertence a outra org`,
    });
    return null;
  }

  return (data.config ?? {}) as Record<string, unknown>;
}

/**
 * Versão "system" — usada pelo webhook handler que ainda não tem
 * contexto de usuário autenticado. Pula o check de role mas faz
 * lookup direto via client server.
 *
 * APENAS pra uso em route handlers de webhook após verificação HMAC.
 */
export async function getChannelConfigSystem(channelId: string): Promise<{
  organizationId: string;
  config: Record<string, unknown>;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select("organization_id, config")
    .eq("id", channelId)
    .maybeSingle();

  if (error) {
    logError("messaging.channel-config-system", error);
    return null;
  }
  if (!data) return null;

  return {
    organizationId: data.organization_id,
    config: (data.config ?? {}) as Record<string, unknown>,
  };
}
