"use server";

import { fileTypeFromBuffer } from "file-type";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrgMember } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getDeal } from "./queries";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function sanitizeName(input: string): string {
  let name = input.toLowerCase().replace(/[^a-z0-9._-]/g, "_");
  let prev: string;
  do {
    prev = name;
    name = name.replaceAll("..", ".");
  } while (name !== prev);
  const lastDot = name.lastIndexOf(".");
  if (lastDot >= 0 && name.length - lastDot - 1 > 5) {
    name = name.slice(0, lastDot + 6);
  }
  return name;
}

const pathSchema = z.object({ orgSlug: z.string(), path: z.string().min(3) });

export async function uploadDealDocumentAction(
  formData: FormData,
): Promise<ActionResult<{ path: string; name: string; size: number }>> {
  const orgSlug = formData.get("orgSlug");
  const dealId = formData.get("dealId");
  const file = formData.get("file");

  if (typeof orgSlug !== "string" || typeof dealId !== "string") {
    return { ok: false, error: "Dados inválidos" };
  }
  if (!(file instanceof File)) return { ok: false, error: "Arquivo inválido" };
  if (file.size === 0) return { ok: false, error: "Arquivo vazio" };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Arquivo muito grande. Máximo 10 MB." };
  }

  const { org } = await requireOrgMember({ orgSlug });
  const deal = await getDeal(org.id, dealId);
  if (!deal) return { ok: false, error: "Você não tem acesso a esse deal" };

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    return { ok: false, error: "Só aceito PDF, JPG, PNG ou WEBP" };
  }

  const timestamp = Date.now();
  const safeName = sanitizeName(file.name) || `arquivo.${detected.ext}`;
  const path = `${org.id}/${dealId}/${timestamp}_${safeName}`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("deal-documents")
    .upload(path, buffer, { contentType: detected.mime, upsert: false });

  if (error) {
    logError("deals.uploadDoc", { code: "upload", message: error.message });
    return { ok: false, error: "Não consegui enviar o arquivo. Tenta de novo." };
  }

  revalidatePath(`/app/${orgSlug}/deals/${dealId}`);
  return { ok: true, data: { path, name: safeName, size: file.size } };
}

export async function deleteDealDocumentAction(input: {
  orgSlug: string;
  path: string;
}): Promise<ActionResult> {
  const parsed = pathSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  if (!parsed.data.path.startsWith(`${org.id}/`)) {
    return { ok: false, error: "Você não tem acesso a esse arquivo" };
  }

  const supabase = await createClient();
  const { error } = await supabase.storage.from("deal-documents").remove([parsed.data.path]);

  if (error) {
    logError("deals.deleteDoc", { code: "delete", message: error.message });
    return { ok: false, error: "Não consegui apagar o arquivo. Tenta de novo." };
  }

  const segments = parsed.data.path.split("/");
  if (segments.length >= 2) {
    revalidatePath(`/app/${parsed.data.orgSlug}/deals/${segments[1]}`);
  }
  return { ok: true };
}

export async function getDealDocumentUrlAction(input: {
  orgSlug: string;
  path: string;
}): Promise<ActionResult<{ url: string }>> {
  const parsed = pathSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  if (!parsed.data.path.startsWith(`${org.id}/`)) {
    return { ok: false, error: "Você não tem acesso a esse arquivo" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("deal-documents")
    .createSignedUrl(parsed.data.path, 60);

  if (error || !data?.signedUrl) {
    logError("deals.docUrl", { code: "signedUrl", message: error?.message });
    return { ok: false, error: "Não consegui gerar o link. Tenta de novo." };
  }
  return { ok: true, data: { url: data.signedUrl } };
}
