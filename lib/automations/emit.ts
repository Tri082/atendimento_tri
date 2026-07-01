import { after } from "next/server";
import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/supabase";
import { AUTOMATION_LIMITS } from "./limits";
import { TRIGGERS } from "./registry";

export interface EmitParams {
  orgId: string;
  triggerType: string;
  eventId: string;
  payload: Record<string, unknown>;
  depth?: number;
}

/**
 * Sub-H M-2: enriquece o payload do trigger com `_meta` antes de inserir na queue.
 * Centraliza a lógica pra dry-run e retry usarem a mesma fonte (era duplicada
 * em emit.ts, actions.server.ts dry-run e retry).
 */
export function enrichPayloadForRun(
  payload: Record<string, unknown>,
  opts: { depth: number; dryRun: boolean },
): Record<string, unknown> {
  return {
    ...payload,
    _meta: { depth: opts.depth, dry_run: opts.dryRun },
  };
}

/**
 * Insere automation_runs(pending) pra cada automação ativa que escuta o trigger.
 * Aplica triggerConfig matching. Idempotente via UNIQUE(automation_id, trigger_event_id).
 *
 * Sub-H Round-2 #7: `kickWorker` controla o disparo do worker depois do insert.
 * Quando chamado por `emitAfter` (que já está dentro de `after()` do Next 16),
 * não pode aninhar outro `after()` — perde silenciosamente. Em vez disso,
 * roda processNextRuns diretamente quando `kickWorker: true`.
 * Quando chamado fora de `after()` (uso direto fire-and-forget), usar `kickWorker: false`.
 */
export async function emitEvent(
  params: EmitParams,
  opts: { kickWorker?: boolean } = {},
): Promise<void> {
  const { orgId, triggerType, eventId, payload, depth = 0 } = params;

  if (depth > AUTOMATION_LIMITS.MAX_RECURSION_DEPTH) {
    console.warn(
      `[automations.emit] depth ${depth} excede limite — descartando ${triggerType} ${eventId}`,
    );
    return;
  }

  const triggerDef = TRIGGERS[triggerType];
  if (!triggerDef) {
    console.warn(`[automations.emit] trigger desconhecido: ${triggerType}`);
    return;
  }

  // Tamanho do payload — antes era descarte silencioso (só warn).
  // Agora grava row visível pra aluno ver no histórico (skipped_payload_too_large).
  const payloadBytes = Buffer.byteLength(JSON.stringify(payload));
  if (payloadBytes > AUTOMATION_LIMITS.MAX_TRIGGER_PAYLOAD_BYTES) {
    console.warn(
      `[automations.emit] payload ${payloadBytes}B excede limite — registrando skipped pra ${triggerType} ${eventId}`,
    );
    const supabaseEarly = createServiceClient();
    const { data: automationsEarly } = await supabaseEarly
      .from("automations")
      .select("id, trigger_config")
      .eq("organization_id", orgId)
      .eq("trigger_type", triggerType)
      .eq("status", "active");
    if (automationsEarly && automationsEarly.length > 0) {
      const triggerDefForMatch = TRIGGERS[triggerType];
      if (triggerDefForMatch) {
        const now = new Date().toISOString();
        // Payload truncado pro registro (pra não inflar a row do skip)
        const truncatedPayload = {
          _truncated: true,
          _original_size_bytes: payloadBytes,
          _meta: { depth, dry_run: false },
        };
        for (const auto of automationsEarly) {
          const cfgParse = triggerDefForMatch.triggerConfigSchema.safeParse(
            auto.trigger_config ?? {},
          );
          if (!cfgParse.success) continue;
          if (
            !triggerConfigMatches(
              triggerType,
              cfgParse.data as Record<string, unknown>,
              payload,
            )
          )
            continue;
          const { error: insErr } = await supabaseEarly
            .from("automation_runs")
            .insert({
              organization_id: orgId,
              automation_id: auto.id,
              trigger_event_id: eventId,
              trigger_payload: truncatedPayload as Json,
              depth,
              status: "skipped_payload_too_large",
              finished_at: now,
              error: `Payload do evento (${(payloadBytes / 1024).toFixed(1)}KB) excedeu o limite de ${AUTOMATION_LIMITS.MAX_TRIGGER_PAYLOAD_BYTES / 1024}KB. Evento descartado.`,
            });
          if (insErr && (insErr as { code?: string }).code !== "23505") {
            logError("automations.emit.skip-payload-too-large", insErr);
          }
        }
      }
    }
    return;
  }

  const supabase = createServiceClient();

  // Lê automations ativas pra esse trigger nessa org PRIMEIRO,
  // pra saber quantos matches existem antes de decidir o queue overflow.
  const { data: automations, error } = await supabase
    .from("automations")
    .select("id, trigger_config")
    .eq("organization_id", orgId)
    .eq("trigger_type", triggerType)
    .eq("status", "active");

  if (error) {
    logError("automations.emit.read", error);
    return;
  }
  if (!automations || automations.length === 0) return;

  // Queue overflow check — agora registra como skipped_queue_full
  // pra aluno enxergar o que aconteceu no histórico (em vez de só warn no log).
  const { count: pendingCount } = await supabase
    .from("automation_runs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "pending");

  const enrichedPayload = enrichPayloadForRun(payload, { depth, dryRun: false });

  if ((pendingCount ?? 0) >= AUTOMATION_LIMITS.MAX_PENDING_RUNS_PER_ORG) {
    console.warn(
      `[automations.emit] queue cheia (${pendingCount}) — gravando ${automations.length} runs como skipped_queue_full pra ${triggerType} ${eventId}`,
    );
    for (const auto of automations) {
      const triggerDefForMatch = TRIGGERS[triggerType];
      if (!triggerDefForMatch) continue;
      const cfgParse = triggerDefForMatch.triggerConfigSchema.safeParse(
        auto.trigger_config ?? {},
      );
      if (!cfgParse.success) continue;
      if (
        !triggerConfigMatches(
          triggerType,
          cfgParse.data as Record<string, unknown>,
          payload,
        )
      )
        continue;
      const { error: insErr } = await supabase
        .from("automation_runs")
        .insert({
          organization_id: orgId,
          automation_id: auto.id,
          trigger_event_id: eventId,
          trigger_payload: enrichedPayload as Json,
          depth,
          status: "skipped_queue_full",
          finished_at: new Date().toISOString(),
          error: `Queue cheia (${pendingCount} pending) — evento descartado`,
        });
      if (insErr && (insErr as { code?: string }).code !== "23505") {
        logError("automations.emit.skip-queue-full", insErr);
      }
    }
    return;
  }

  for (const auto of automations) {
    // Filtra por triggerConfig
    const cfgParse = triggerDef.triggerConfigSchema.safeParse(
      auto.trigger_config ?? {},
    );
    if (!cfgParse.success) continue;

    if (
      !triggerConfigMatches(
        triggerType,
        cfgParse.data as Record<string, unknown>,
        payload,
      )
    )
      continue;

    const { error: insErr } = await supabase.from("automation_runs").insert({
      organization_id: orgId,
      automation_id: auto.id,
      trigger_event_id: eventId,
      trigger_payload: enrichedPayload as Json,
      depth,
      status: "pending",
    });

    // Conflito em UNIQUE = idempotência silenciosa
    if (insErr && (insErr as { code?: string }).code !== "23505") {
      logError("automations.emit.insert", insErr);
    }
  }

  // Sub-H Round-2 #7: kick condicional — sem after() aninhado.
  // Quando chamado de dentro de `after()` (via emitAfter), Next 16 não aceita
  // outro `after()` aninhado e perde silenciosamente. Roda direto.
  if (opts.kickWorker) {
    const { processNextRuns } = await import("./worker");
    processNextRuns({ limit: 5 }).catch((err) =>
      logError("automations.emit.kick", err),
    );
  }
}

/**
 * Aplica filtros do triggerConfig contra o payload.
 * Específico por trigger — minimalista no MVP, expande conforme triggers cresçam.
 */
function triggerConfigMatches(
  triggerType: string,
  cfg: Record<string, unknown>,
  payload: Record<string, unknown>,
): boolean {
  if (triggerType === "conversation.created" || triggerType === "message.received") {
    const allowed = cfg.channel_type_in as string[] | undefined;
    if (allowed && allowed.length > 0) {
      const channelType = (payload.channel as { type?: string } | undefined)?.type;
      if (!channelType || !allowed.includes(channelType)) return false;
    }
    const bodyContains = cfg.body_contains as string | undefined;
    if (bodyContains) {
      const body =
        (payload.message as { body?: string | null } | undefined)?.body ?? "";
      if (!body.toLowerCase().includes(bodyContains.toLowerCase())) return false;
    }
  }
  if (triggerType === "deal.stage_changed") {
    const onlyNew = cfg.only_new_stage as string | undefined;
    const onlyFrom = cfg.only_from_stage as string | undefined;
    const deal = payload.deal as
      | { previous_stage?: string; new_stage?: string }
      | undefined;
    if (onlyNew && deal?.new_stage !== onlyNew) return false;
    if (onlyFrom && deal?.previous_stage !== onlyFrom) return false;
  }
  if (triggerType === "deal.created") {
    const onlyStage = cfg.only_stage as string | undefined;
    const deal = payload.deal as { stage?: string } | undefined;
    if (onlyStage && deal?.stage !== onlyStage) return false;
  }
  if (triggerType === "contact.created") {
    const onlyWithEmail = cfg.only_with_email as boolean | undefined;
    if (onlyWithEmail) {
      const email = (payload.contact as { email?: string | null } | undefined)
        ?.email;
      if (!email) return false;
    }
  }
  if (
    triggerType === "contact.tag_added" ||
    triggerType === "contact.tag_removed" ||
    triggerType === "deal.tag_added" ||
    triggerType === "conversation.tag_added"
  ) {
    const onlyTag = cfg.tag_id as string | undefined;
    const tagId = payload.tag_id as string | undefined;
    if (onlyTag && tagId !== onlyTag) return false;
  }
  return true;
}

/**
 * Dispara emitEvent em `after()` com error catch.
 * Conveniência pros emitters de domain code — esconde o boilerplate
 * do snapshot + `after()` + `.catch(logError)`.
 *
 * Use:
 *   emitAfter("contact-created", { orgId, triggerType: "contact.created", eventId, payload });
 *
 * `scope` vira parte do prefixo no logError ("automations.emit.<scope>").
 */
export function emitAfter(scope: string, params: EmitParams): void {
  after(() =>
    // Sub-H Round-2 #7: kickWorker true rodando dentro do after() externo —
    // sem nested after(), processNextRuns roda inline (logo após o insert).
    emitEvent(params, { kickWorker: true }).catch((err) =>
      logError(`automations.emit.${scope}`, err),
    ),
  );
}
