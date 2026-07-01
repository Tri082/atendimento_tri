"use server";

import { revalidatePath } from "next/cache";
import { requireOrgMember, requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  convTagInputSchema,
  createTagInputSchema,
  tagIdInputSchema,
  updateTagInputSchema,
  type ConvTagInput,
  type CreateTagInput,
  type TagIdInput,
  type UpdateTagInput,
} from "./schemas";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function createTagAction(input: CreateTagInput): Promise<Result<{ id: string }>> {
  const parsed = createTagInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({
      organization_id: org.id,
      name: parsed.data.name,
      color: parsed.data.color,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    const isDup = (error as { code?: string } | null)?.code === "23505";
    logError("tags.create", error);
    return { ok: false, error: isDup ? "Já existe uma tag com esse nome." : "Não foi possível criar tag." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/tags`);
  return { ok: true, data: { id: data.id } };
}

export async function updateTagAction(input: UpdateTagInput): Promise<Result> {
  const parsed = updateTagInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();

  const patch: { name?: string; color?: string } = {};
  if (parsed.data.name) patch.name = parsed.data.name;
  if (parsed.data.color) patch.color = parsed.data.color;

  const { error } = await supabase
    .from("tags")
    .update(patch)
    .eq("id", parsed.data.tagId)
    .eq("organization_id", org.id);
  if (error) {
    logError("tags.update", error);
    return { ok: false, error: "Não foi possível atualizar tag." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/tags`);
  return { ok: true };
}

export async function deleteTagAction(input: TagIdInput): Promise<Result> {
  const parsed = tagIdInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();
  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", parsed.data.tagId)
    .eq("organization_id", org.id);
  if (error) {
    logError("tags.delete", error);
    return { ok: false, error: "Não foi possível remover tag." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/tags`);
  return { ok: true };
}

export async function addTagToConversationAction(input: ConvTagInput): Promise<Result> {
  const parsed = convTagInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  const { error } = await supabase.from("conversation_tag_links").insert({
    conversation_id: parsed.data.conversationId,
    tag_id: parsed.data.tagId,
    organization_id: org.id,
  });
  if (error && (error as { code?: string }).code !== "23505") {
    logError("tags.link.add", error);
    return { ok: false, error: "Não foi possível adicionar tag." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  return { ok: true };
}

export async function removeTagFromConversationAction(input: ConvTagInput): Promise<Result> {
  const parsed = convTagInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversation_tag_links")
    .delete()
    .eq("conversation_id", parsed.data.conversationId)
    .eq("tag_id", parsed.data.tagId)
    .eq("organization_id", org.id);
  if (error) {
    logError("tags.link.remove", error);
    return { ok: false, error: "Não foi possível remover tag." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  return { ok: true };
}
