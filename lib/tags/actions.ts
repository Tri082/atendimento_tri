"use server";

import { revalidatePath } from "next/cache";
import { requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  type CreateTagInput,
  createTagSchema,
  type DeleteTagInput,
  deleteTagSchema,
  type IgnoreSuggestionInput,
  ignoreSuggestionSchema,
  type PromoteSuggestionInput,
  promoteSuggestionSchema,
  type UpdateTagInput,
  updateTagSchema,
} from "./schemas";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function createTagAction(
  input: CreateTagInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { user, org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({
      organization_id: org.id,
      name: parsed.data.name,
      color: parsed.data.color,
      applies_to: parsed.data.appliesTo,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    logError("tags.create", error);
    if (error?.code === "23505") {
      return { ok: false, error: "Já existe uma tag com esse nome." };
    }
    return { ok: false, error: "Erro ao criar tag. Tente novamente." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/tags`);
  return { ok: true, data: { id: data.id } };
}

export async function updateTagAction(input: UpdateTagInput): Promise<ActionResult> {
  const parsed = updateTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const patch: { name?: string; color?: string; applies_to?: string[] } = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.color !== undefined) patch.color = parsed.data.color;
  if (parsed.data.appliesTo !== undefined) patch.applies_to = parsed.data.appliesTo;
  const { error } = await supabase
    .from("tags")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);
  if (error) {
    logError("tags.update", error);
    if (error.code === "23505") {
      return { ok: false, error: "Já existe uma tag com esse nome." };
    }
    return { ok: false, error: "Erro ao atualizar tag." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/tags`);
  return { ok: true };
}

export async function deleteTagAction(input: DeleteTagInput): Promise<ActionResult> {
  const parsed = deleteTagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);
  if (error) {
    logError("tags.delete", error);
    return { ok: false, error: "Erro ao excluir tag." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/tags`);
  return { ok: true };
}

export async function promoteSuggestionAction(
  input: PromoteSuggestionInput,
): Promise<ActionResult<{ tagId: string }>> {
  const parsed = promoteSuggestionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { user, org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const { data: suggestion } = await supabase
    .from("tag_suggestions")
    .select("name")
    .eq("id", parsed.data.suggestionId)
    .eq("organization_id", org.id)
    .is("resolved_status", null)
    .maybeSingle();
  if (!suggestion) {
    return { ok: false, error: "Sugestão não encontrada ou já resolvida." };
  }
  const { data: tag, error: tagErr } = await supabase
    .from("tags")
    .insert({
      organization_id: org.id,
      name: suggestion.name,
      color: parsed.data.color,
      applies_to: parsed.data.appliesTo,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (tagErr || !tag) {
    logError("tags.promote.create", tagErr);
    if (tagErr?.code === "23505") {
      return { ok: false, error: "Já existe uma tag com esse nome." };
    }
    return { ok: false, error: "Erro ao promover sugestão." };
  }
  await supabase
    .from("tag_suggestions")
    .update({
      resolved_status: "promoted",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", parsed.data.suggestionId);
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/tags`);
  return { ok: true, data: { tagId: tag.id } };
}

export async function ignoreSuggestionAction(
  input: IgnoreSuggestionInput,
): Promise<ActionResult> {
  const parsed = ignoreSuggestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { user, org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();
  const { error } = await supabase
    .from("tag_suggestions")
    .update({
      resolved_status: "ignored",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", parsed.data.suggestionId)
    .eq("organization_id", org.id);
  if (error) {
    logError("tags.ignore", error);
    return { ok: false, error: "Erro ao ignorar sugestão." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/tags`);
  return { ok: true };
}
