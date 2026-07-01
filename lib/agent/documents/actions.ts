"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { processDocument } from "@/lib/agent/rag/ingest";
import { createClient } from "@/lib/supabase/server";
import {
  deleteDocumentInputSchema,
  reprocessDocumentInputSchema,
  uploadDocumentInputSchema,
  type DeleteDocumentInput,
  type ReprocessDocumentInput,
  type UploadDocumentInput,
} from "./schemas";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const MAX_BYTES = 20 * 1024 * 1024;

async function assertAgentInOrg(supabase: Awaited<ReturnType<typeof createClient>>, agentId: string, orgId: string) {
  const { data } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return Boolean(data);
}

export async function uploadDocumentAction(input: UploadDocumentInput): Promise<Result<{ id: string }>> {
  const parsed = uploadDocumentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });

  const buf = Buffer.from(parsed.data.fileBase64, "base64");
  if (buf.length > MAX_BYTES) return { ok: false, error: "Arquivo maior que 20MB." };

  const detected = await fileTypeFromBuffer(buf);
  if (!detected || detected.mime !== "application/pdf") {
    return { ok: false, error: "Só PDF é aceito." };
  }

  const supabase = await createClient();

  if (!(await assertAgentInOrg(supabase, parsed.data.agentId, org.id))) {
    return { ok: false, error: "Agente não encontrado." };
  }

  const { data: doc, error: insErr } = await supabase
    .from("agent_documents")
    .insert({
      organization_id: org.id,
      agent_id: parsed.data.agentId,
      filename: parsed.data.filename,
      storage_path: "",
      mime_type: detected.mime,
      size_bytes: buf.length,
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !doc) {
    logError("agent.doc.upload.insert", insErr);
    return { ok: false, error: "Não foi possível registrar documento." };
  }

  const path = `${org.id}/${parsed.data.agentId}/${doc.id}/${parsed.data.filename}`;

  const { error: upErr } = await supabase.storage
    .from("agent-kb")
    .upload(path, buf, { contentType: detected.mime, upsert: false });
  if (upErr) {
    logError("agent.doc.upload.storage", upErr);
    await supabase.from("agent_documents").delete().eq("id", doc.id);
    return { ok: false, error: "Não foi possível subir arquivo." };
  }

  await supabase
    .from("agent_documents")
    .update({ storage_path: path })
    .eq("id", doc.id);

  after(() => processDocument(doc.id));

  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents/${parsed.data.agentId}`);
  return { ok: true, data: { id: doc.id } };
}

export async function deleteDocumentAction(input: DeleteDocumentInput): Promise<Result> {
  const parsed = deleteDocumentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("agent_documents")
    .select("storage_path")
    .eq("id", parsed.data.documentId)
    .eq("agent_id", parsed.data.agentId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (doc?.storage_path) {
    await supabase.storage.from("agent-kb").remove([doc.storage_path]);
  }

  const { error } = await supabase
    .from("agent_documents")
    .delete()
    .eq("id", parsed.data.documentId)
    .eq("agent_id", parsed.data.agentId)
    .eq("organization_id", org.id);
  if (error) {
    logError("agent.doc.delete", error);
    return { ok: false, error: "Não foi possível remover documento." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents/${parsed.data.agentId}`);
  return { ok: true };
}

export async function reprocessDocumentAction(input: ReprocessDocumentInput): Promise<Result> {
  const parsed = reprocessDocumentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("agent_documents")
    .select("id, status")
    .eq("id", parsed.data.documentId)
    .eq("agent_id", parsed.data.agentId)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Documento não encontrado." };
  if (doc.status === "processing") {
    return { ok: false, error: "Documento ainda está sendo processado. Aguarde." };
  }

  // Apaga chunks antigos
  await supabase
    .from("agent_document_chunks")
    .delete()
    .eq("document_id", parsed.data.documentId);

  // Reset status pra pending — processDocument vai pegar via lock conditional
  const { error } = await supabase
    .from("agent_documents")
    .update({ status: "pending", chunk_count: 0, error_message: null, ready_at: null })
    .eq("id", parsed.data.documentId);
  if (error) {
    logError("agent.doc.reprocess", error);
    return { ok: false, error: "Não foi possível iniciar o reprocessamento." };
  }

  after(() => processDocument(parsed.data.documentId));
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents/${parsed.data.agentId}`);
  return { ok: true };
}
