"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { requireOrgRole } from "@/lib/auth/guards";
import { getDefaultCompanyId } from "@/lib/companies/queries";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json, TablesUpdate } from "@/types/supabase";
import { enrichPayloadForRun } from "./emit";
import { AUTOMATION_LIMITS } from "./limits";
import { PLACEHOLDER_PATTERNS, applyTemplateAutoFill } from "./placeholders";
import { TRIGGERS } from "./registry";
import { type AutomationInput, automationSchema } from "./schemas";
import { getTemplate } from "./templates";
import { processNextRuns } from "./worker";

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const orgSlugSchema = z.string().min(1).max(80);

export async function createAutomationAction(
  input: { orgSlug: string } & AutomationInput,
): Promise<ActionResult<{ id: string }>> {
  const orgSlugParse = orgSlugSchema.safeParse(input.orgSlug);
  if (!orgSlugParse.success) return { ok: false, error: "Slug inválido" };
  const parsed = automationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }
  if (!TRIGGERS[parsed.data.trigger_type]) {
    return { ok: false, error: "Trigger desconhecido" };
  }
  const { user, org } = await requireOrgRole({
    orgSlug: orgSlugParse.data,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automations")
    .insert({
      organization_id: org.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      trigger_type: parsed.data.trigger_type,
      trigger_config: parsed.data.trigger_config as Json,
      conditions: parsed.data.conditions as unknown as Json,
      actions: parsed.data.actions as unknown as Json,
      status: parsed.data.status,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    logError("automations.create", error);
    return {
      ok: false,
      error: "Não consegui criar a automação. Tenta de novo.",
    };
  }
  revalidatePath(`/app/${orgSlugParse.data}/automacoes`);
  return { ok: true, data: { id: data.id } };
}

const updateInputSchema = z.object({
  orgSlug: orgSlugSchema,
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  trigger_type: z.string().optional(),
  trigger_config: z.record(z.string(), z.unknown()).optional(),
  conditions: z.array(z.unknown()).optional(),
  actions: z.array(z.unknown()).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
});

export async function updateAutomationAction(
  input: z.infer<typeof updateInputSchema>,
): Promise<ActionResult> {
  const parsed = updateInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const patch: TablesUpdate<"automations"> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    patch.description = parsed.data.description;
  if (parsed.data.trigger_type !== undefined)
    patch.trigger_type = parsed.data.trigger_type;
  if (parsed.data.trigger_config !== undefined)
    patch.trigger_config = parsed.data.trigger_config as Json;
  if (parsed.data.conditions !== undefined)
    patch.conditions = parsed.data.conditions as unknown as Json;
  if (parsed.data.actions !== undefined)
    patch.actions = parsed.data.actions as unknown as Json;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  const { error } = await supabase
    .from("automations")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);
  if (error) {
    logError("automations.update", error);
    return { ok: false, error: "Não consegui salvar a automação." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/automacoes`);
  revalidatePath(`/app/${parsed.data.orgSlug}/automacoes/${parsed.data.id}`);
  return { ok: true };
}

const idInputSchema = z.object({
  orgSlug: orgSlugSchema,
  id: z.string().uuid(),
});

export async function deleteAutomationAction(
  input: z.infer<typeof idInputSchema>,
): Promise<ActionResult> {
  const parsed = idInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const { error } = await supabase
    .from("automations")
    .delete()
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);
  if (error) {
    logError("automations.delete", error);
    return { ok: false, error: "Não consegui excluir." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/automacoes`);
  return { ok: true };
}

const statusInputSchema = z.object({
  orgSlug: orgSlugSchema,
  id: z.string().uuid(),
  status: z.enum(["draft", "active", "paused"]),
});

export async function setAutomationStatusAction(
  input: z.infer<typeof statusInputSchema>,
): Promise<ActionResult> {
  const parsed = statusInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  // Sub-H Round-2 #6: regex case-insensitive cobrindo todas as variantes de placeholder
  // (PREENCHA_, TROQUE_ESTE_SECRETO, SEU_HOOK_AQUI, SUBSTITUA_, e com espaços).
  // Constante centralizada em ./placeholders pra reuso com findPlaceholderPaths.
  if (parsed.data.status === "active") {
    const { data: auto } = await supabase
      .from("automations")
      .select("actions")
      .eq("id", parsed.data.id)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (auto) {
      const actionsJson = JSON.stringify(auto.actions);
      if (PLACEHOLDER_PATTERNS.some((p) => p.test(actionsJson))) {
        return {
          ok: false,
          error:
            "Edite a automação antes de ativar — ainda tem um campo placeholder não preenchido (PREENCHA_*, SEU_HOOK_AQUI, TROQUE_ESTE_SECRETO).",
        };
      }
    }
  }
  const { error } = await supabase
    .from("automations")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);
  if (error) {
    logError("automations.set-status", error);
    return { ok: false, error: "Não consegui atualizar status." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/automacoes`);
  revalidatePath(`/app/${parsed.data.orgSlug}/automacoes/${parsed.data.id}`);
  return { ok: true };
}

const dryRunInputSchema = z.object({
  orgSlug: orgSlugSchema,
  id: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Dispara uma run em modo dry-run pra testar a automação sem efeito colateral.
 * Restrita a owner/admin pra evitar DoS interno via queue overflow.
 */
export async function runAutomationDryRunAction(
  input: z.infer<typeof dryRunInputSchema>,
): Promise<ActionResult<{ runId: string }>> {
  const parsed = dryRunInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  // Sub-H M-1: limit de tamanho do payload (mesmo do emit)
  const payloadBytes = parsed.data.payload
    ? Buffer.byteLength(JSON.stringify(parsed.data.payload))
    : 0;
  if (payloadBytes > AUTOMATION_LIMITS.MAX_TRIGGER_PAYLOAD_BYTES) {
    return {
      ok: false,
      error: `Payload muito grande (máx ${AUTOMATION_LIMITS.MAX_TRIGGER_PAYLOAD_BYTES / 1024}KB).`,
    };
  }
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = createServiceClient();
  const { data: auto } = await supabase
    .from("automations")
    .select("trigger_type")
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!auto) return { ok: false, error: "Automação não encontrada" };
  const trigger = TRIGGERS[auto.trigger_type];
  if (!trigger) return { ok: false, error: "Trigger desconhecido" };

  const samplePayload = (parsed.data.payload ??
    trigger.sampleContext) as Record<string, unknown>;
  // Sub-H M-2: helper centralizado
  const enriched = enrichPayloadForRun(samplePayload, { depth: 0, dryRun: true });
  const eventId = `dry-run-${randomUUID()}`;
  const { data: run, error } = await supabase
    .from("automation_runs")
    .insert({
      organization_id: org.id,
      automation_id: parsed.data.id,
      trigger_event_id: eventId,
      trigger_payload: enriched as Json,
      depth: 0,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !run) {
    logError("automations.dry-run", error);
    return { ok: false, error: "Não consegui agendar a simulação." };
  }
  after(() =>
    processNextRuns({ limit: 1 }).catch((err) =>
      logError("automations.dry-run.kick", err),
    ),
  );
  return { ok: true, data: { runId: run.id } };
}

const retryInputSchema = z.object({
  orgSlug: orgSlugSchema,
  runId: z.string().uuid(),
});

export async function retryRunAction(
  input: z.infer<typeof retryInputSchema>,
): Promise<ActionResult<{ runId: string }>> {
  const parsed = retryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = createServiceClient();
  const { data: old } = await supabase
    .from("automation_runs")
    .select("*")
    .eq("id", parsed.data.runId)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!old) return { ok: false, error: "Run não encontrada" };
  // Sub-H H-5: bloquear retry de dry-run pra não virar efeito real
  const oldMeta = (old.trigger_payload as Record<string, unknown> | null)
    ?._meta as { dry_run?: boolean } | undefined;
  if (oldMeta?.dry_run === true || old.trigger_event_id.startsWith("dry-run-")) {
    return {
      ok: false,
      error:
        "Não dá pra re-executar uma simulação. Use o botão Testar pra rodar uma nova.",
    };
  }
  // Sub-H Round-2 #16: counter em vez de Date.now() pra UNIQUE bloquear duplo-click.
  // Conta retries existentes pra esse eventId — duplo-click no mesmo ms colide na UNIQUE.
  const { count: existingRetries } = await supabase
    .from("automation_runs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .like("trigger_event_id", `${old.trigger_event_id}:retry-%`);
  const retryNum = (existingRetries ?? 0) + 1;
  const newEventId = `${old.trigger_event_id}:retry-${retryNum}`;
  // Limpa _meta.dry_run pra retry sempre rodar pra valer.
  // (Mantém depth original — retry não escapa do recursion guard.)
  const rawPayload = (old.trigger_payload ?? {}) as Record<string, unknown>;
  // Sub-H M-2: helper centralizado
  const cleanPayload = enrichPayloadForRun(rawPayload, {
    depth: old.depth ?? 0,
    dryRun: false,
  });
  const { data: newRun, error } = await supabase
    .from("automation_runs")
    .insert({
      organization_id: old.organization_id,
      automation_id: old.automation_id,
      trigger_event_id: newEventId,
      trigger_payload: cleanPayload as Json,
      depth: old.depth,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !newRun) {
    // Sub-H Round-2 #16: 23505 = UNIQUE violation = duplo-click no mesmo retryNum
    if (error && (error as { code?: string }).code === "23505") {
      return { ok: false, error: "Re-execução já em andamento. Aguarde." };
    }
    logError("automations.retry", error);
    return { ok: false, error: "Não consegui re-executar." };
  }
  after(() =>
    processNextRuns({ limit: 1 }).catch((err) =>
      logError("automations.retry.kick", err),
    ),
  );
  return { ok: true, data: { runId: newRun.id } };
}

const fromTemplateInputSchema = z.object({
  orgSlug: orgSlugSchema,
  templateId: z.string().min(1).max(80),
});

/**
 * Cria automação a partir de um template e redireciona pro detalhe.
 * Invocada via `<form action={...}>` no template-card — sempre redireciona, nunca retorna.
 * NÃO chamar de Server Component em render: usa `redirect` + `revalidatePath` (só Server Action).
 */
export async function createFromTemplateAction(
  input: z.infer<typeof fromTemplateInputSchema>,
): Promise<void> {
  const parsed = fromTemplateInputSchema.safeParse(input);
  if (!parsed.success) {
    redirect(`/app/${input.orgSlug}/automacoes?error=template_invalid`);
  }
  const template = getTemplate(parsed.data.templateId);
  if (!template) {
    redirect(`/app/${parsed.data.orgSlug}/automacoes?error=template_invalid`);
  }
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const defaultCompanyId = await getDefaultCompanyId(org.id);
  const filled = applyTemplateAutoFill(template.automation, { defaultCompanyId });
  const result = await createAutomationAction({
    orgSlug: parsed.data.orgSlug,
    ...filled,
  });
  if (result.ok && result.data) {
    redirect(
      `/app/${parsed.data.orgSlug}/automacoes/${result.data.id}?fromTemplate=${parsed.data.templateId}`,
    );
  }
  redirect(`/app/${parsed.data.orgSlug}/automacoes?error=template_invalid`);
}
