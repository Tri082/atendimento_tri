"use server";

import { revalidatePath } from "next/cache";
import { requireOrgMember, requireOrgRole } from "@/lib/auth/guards";
import { emitAfter } from "@/lib/automations/emit";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/supabase";
import {
  type CreateDealInput,
  createDealSchema,
  type DeleteDealInput,
  deleteDealSchema,
  type LinkDealContactInput,
  linkDealContactSchema,
  type MoveDealStageInput,
  moveDealStageSchema,
  type UpdateDealInput,
  updateDealSchema,
} from "./schemas";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function emptyToNull<T>(v: T | undefined | ""): T | null {
  if (v === undefined || v === ("" as unknown as T)) return null;
  return v as T;
}

export async function createDealAction(
  input: CreateDealInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createDealSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deals")
    .insert({
      organization_id: org.id,
      company_id: parsed.data.companyId,
      name: parsed.data.name,
      stage: parsed.data.stage ?? "new",
      value: parsed.data.value ?? null,
      expected_close_date: emptyToNull(parsed.data.expectedCloseDate ?? undefined),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logError("deals.create", error);
    return { ok: false, error: "Não consegui criar o deal. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/deals`);
  revalidatePath(`/app/${parsed.data.orgSlug}/empresas/${parsed.data.companyId}`);

  // Sub-H: emit deal.created (idempotente via deal.id)
  {
    const newDealId = data.id;
    const orgId = org.id;
    const orgSlug = parsed.data.orgSlug;
    const dealStage = parsed.data.stage ?? "new";
    const dealName = parsed.data.name;
    const dealValue = parsed.data.value ?? null;
    const companyId = parsed.data.companyId ?? null;
    emitAfter("deal-created", {
      orgId,
      triggerType: "deal.created",
      eventId: newDealId,
      payload: {
        deal: {
          id: newDealId,
          name: dealName,
          stage: dealStage,
          value: dealValue,
          owner_id: null,
          company_id: companyId,
        },
        org: { id: orgId, name: "", slug: orgSlug },
      },
    });
  }

  return { ok: true, data: { id: data.id } };
}

export async function updateDealAction(input: UpdateDealInput): Promise<ActionResult> {
  const parsed = updateDealSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const patch: TablesUpdate<"deals"> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.value !== undefined) patch.value = parsed.data.value;
  if (parsed.data.expectedCloseDate !== undefined) {
    patch.expected_close_date = emptyToNull(parsed.data.expectedCloseDate ?? undefined);
  }
  if (parsed.data.lostReason !== undefined) {
    patch.lost_reason = emptyToNull(parsed.data.lostReason ?? undefined);
  }
  if (parsed.data.notes !== undefined) patch.notes = emptyToNull(parsed.data.notes);

  const { error } = await supabase
    .from("deals")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);

  if (error) {
    logError("deals.update", error);
    return { ok: false, error: "Não consegui salvar. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/deals`);
  revalidatePath(`/app/${parsed.data.orgSlug}/deals/${parsed.data.id}`);
  return { ok: true };
}

export async function moveDealStageAction(input: MoveDealStageInput): Promise<ActionResult> {
  const parsed = moveDealStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  // Sub-H: precisa do previous_stage pra emit deal.stage_changed
  const { data: before } = await supabase
    .from("deals")
    .select("stage, name, value")
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!before) return { ok: false, error: "Deal não encontrado" };
  const previousStage = before.stage;

  const { error } = await supabase
    .from("deals")
    .update({ stage: parsed.data.stage })
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);

  if (error) {
    logError("deals.moveStage", error);
    return { ok: false, error: "Não consegui mover. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/deals`);
  revalidatePath(`/app/${parsed.data.orgSlug}/deals/${parsed.data.id}`);

  // Sub-H: emit deal.stage_changed
  if (previousStage !== parsed.data.stage) {
    const dealId = parsed.data.id;
    const newStage = parsed.data.stage;
    const dealName = before.name;
    const dealValue = before.value;
    const orgId = org.id;
    const orgSlug = parsed.data.orgSlug;
    // Sub-H C-3: timestamp no eventId permite voltar-e-avançar.
    // Sub-H Round-2 #13: coalesce por minuto — toggle rápido de stage em < 60s dedupes
    // (idempotência intencional pra evitar automação rodando 2x se aluno clica rápido).
    const stageChangedMinute = new Date().toISOString().slice(0, 16);
    emitAfter("deal-stage", {
      orgId,
      triggerType: "deal.stage_changed",
      eventId: `${dealId}:${newStage}:${stageChangedMinute}`,
      payload: {
        deal: {
          id: dealId,
          name: dealName,
          value: dealValue,
          previous_stage: previousStage,
          new_stage: newStage,
          owner_id: null,
        },
        org: { id: orgId, name: "", slug: orgSlug },
      },
    });
  }

  return { ok: true };
}

export async function deleteDealAction(input: DeleteDealInput): Promise<ActionResult> {
  const parsed = deleteDealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);

  if (error) {
    logError("deals.delete", error);
    return { ok: false, error: "Não consegui excluir. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/deals`);
  return { ok: true };
}

export async function linkContactToDealAction(input: LinkDealContactInput): Promise<ActionResult> {
  const parsed = linkDealContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const dealCheck = await supabase
    .from("deals")
    .select("id")
    .eq("id", parsed.data.dealId)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (dealCheck.error || !dealCheck.data) {
    return { ok: false, error: "Deal não encontrado" };
  }

  const { error } = await supabase
    .from("deal_contacts")
    .insert({ deal_id: parsed.data.dealId, contact_id: parsed.data.contactId });

  if (error) {
    logError("deals.linkContact", error);
    return { ok: false, error: "Não consegui vincular o contato. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/deals/${parsed.data.dealId}`);
  revalidatePath(`/app/${parsed.data.orgSlug}/contatos/${parsed.data.contactId}`);
  return { ok: true };
}

export async function unlinkContactFromDealAction(
  input: LinkDealContactInput,
): Promise<ActionResult> {
  const parsed = linkDealContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const dealCheck = await supabase
    .from("deals")
    .select("id")
    .eq("id", parsed.data.dealId)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (dealCheck.error || !dealCheck.data) {
    return { ok: false, error: "Deal não encontrado" };
  }

  const { error } = await supabase
    .from("deal_contacts")
    .delete()
    .eq("deal_id", parsed.data.dealId)
    .eq("contact_id", parsed.data.contactId);

  if (error) {
    logError("deals.unlinkContact", error);
    return { ok: false, error: "Não consegui desvincular. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/deals/${parsed.data.dealId}`);
  revalidatePath(`/app/${parsed.data.orgSlug}/contatos/${parsed.data.contactId}`);
  return { ok: true };
}
