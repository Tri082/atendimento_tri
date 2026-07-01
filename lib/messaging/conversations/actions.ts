"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireOrgMember } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { processSendOutbound } from "@/lib/messaging/router";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";
import {
  assignConvInputSchema,
  markReadInputSchema,
  promoteContactInputSchema,
  resolveConvInputSchema,
  retryMessageInputSchema,
  uploadMediaInputSchema,
  type AssignConvInput,
  type MarkReadInput,
  type PromoteContactInput,
  type ResolveConvInput,
  type RetryMessageInput,
  type UploadMediaInput,
} from "./schemas";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function assignConversationAction(input: AssignConvInput): Promise<Result> {
  const parsed = assignConvInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ assignee_id: parsed.data.userId })
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", org.id);
  if (error) {
    logError("inbox.assign", error);
    return { ok: false, error: "Não foi possível atribuir." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  return { ok: true };
}

export async function resolveConversationAction(input: ResolveConvInput): Promise<Result> {
  const parsed = resolveConvInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ status: parsed.data.resolved ? "resolved" : "open" })
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", org.id);
  if (error) {
    logError("inbox.resolve", error);
    return { ok: false, error: "Não foi possível atualizar." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  return { ok: true };
}

export async function markConversationReadAction(input: MarkReadInput): Promise<Result> {
  const parsed = markReadInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  // `.gt("unread_count", 0)` evita rodar UPDATE quando já está zerada.
  // Sem isso: a página dispara markRead a cada render, Postgres roda
  // UPDATE incondicionalmente (mesmo NEW=OLD), trigger set_updated_at
  // muda updated_at, Realtime publica UPDATE, subscriber chama
  // router.refresh(), re-renderiza, dispara markRead de novo — loop.
  await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", org.id)
    .gt("unread_count", 0);
  return { ok: true };
}

export async function retryMessageAction(input: RetryMessageInput): Promise<Result<{ messageId: string }>> {
  const parsed = retryMessageInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const { data: original } = await supabase
    .from("messages")
    .select("conversation_id, body, media_url, media_type, attachments, provider_metadata")
    .eq("id", parsed.data.messageId)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!original) return { ok: false, error: "Mensagem original não encontrada." };

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      organization_id: org.id,
      conversation_id: original.conversation_id,
      direction: "outbound",
      sender_user_id: user.id,
      sender_kind: "user",
      body: original.body,
      media_url: original.media_url,
      media_type: original.media_type,
      attachments: (original.attachments ?? []) as Json,
      provider_metadata: (original.provider_metadata ?? null) as Json,
      status: "sending",
    })
    .select("id")
    .single();
  if (error || !inserted) {
    logError("inbox.retry", error);
    return { ok: false, error: "Não foi possível reenviar." };
  }
  after(() => processSendOutbound(inserted.id));
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  return { ok: true, data: { messageId: inserted.id } };
}

export async function uploadConversationMediaAction(
  input: UploadMediaInput,
): Promise<Result<{ path: string; signedUrl: string }>> {
  const parsed = uploadMediaInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const buf = Buffer.from(parsed.data.fileBase64, "base64");
  const ext = parsed.data.filename.split(".").pop() ?? "bin";
  const safeBase = crypto.randomUUID();
  const path = `${org.id}/${parsed.data.conversationId}/_outbound/${safeBase}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("messaging")
    .upload(path, buf, { contentType: parsed.data.mimeType });
  if (upErr) {
    logError("inbox.upload", upErr);
    return { ok: false, error: "Não foi possível enviar o arquivo." };
  }

  const { data: signed } = await supabase.storage
    .from("messaging")
    .createSignedUrl(path, 3600);
  if (!signed?.signedUrl) return { ok: false, error: "Não foi possível gerar URL." };

  return { ok: true, data: { path, signedUrl: signed.signedUrl } };
}

export async function promoteConversationToContactAction(
  input: PromoteContactInput,
): Promise<Result<{ contactId: string }>> {
  const parsed = promoteContactInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  let contactId: string;
  if (parsed.data.mode === "link") {
    contactId = parsed.data.contactId;
  } else {
    const { data: created, error } = await supabase
      .from("contacts")
      .insert({
        organization_id: org.id,
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        company_id: parsed.data.companyId ?? null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !created) {
      logError("inbox.promote.create", error);
      return { ok: false, error: "Não foi possível criar contato." };
    }
    contactId = created.id;
  }

  const { error: linkErr } = await supabase
    .from("conversations")
    .update({ contact_id: contactId })
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", org.id);
  if (linkErr) {
    logError("inbox.promote.link", linkErr);
    return { ok: false, error: "Não foi possível vincular." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  revalidatePath(`/app/${parsed.data.orgSlug}/contatos`);
  return { ok: true, data: { contactId } };
}
