"use server";

import { revalidatePath } from "next/cache";
import { requireOrgMember, requireOrgRole } from "@/lib/auth/guards";
import { emitAfter } from "@/lib/automations/emit";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/supabase";
import {
  type CreateContactInput,
  createContactSchema,
  type DeleteContactInput,
  deleteContactSchema,
  type UpdateContactInput,
  updateContactSchema,
} from "./schemas";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function emptyToNull(v: string | undefined): string | null {
  return v === undefined || v === "" ? null : v;
}

export async function createContactAction(
  input: CreateContactInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: org.id,
      name: parsed.data.name,
      email: emptyToNull(parsed.data.email),
      phone: emptyToNull(parsed.data.phone),
      title: emptyToNull(parsed.data.title),
      company_id: parsed.data.companyId ?? null,
      notes: emptyToNull(parsed.data.notes),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logError("contacts.create", error);
    return { ok: false, error: "Não consegui criar o contato. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/contatos`);
  if (parsed.data.companyId) {
    revalidatePath(`/app/${parsed.data.orgSlug}/empresas/${parsed.data.companyId}`);
  }

  // Sub-H: emit contact.created
  {
    const newContactId = data.id;
    const orgId = org.id;
    const orgSlug = parsed.data.orgSlug;
    const contactName = parsed.data.name;
    const contactEmail = emptyToNull(parsed.data.email);
    const contactPhone = emptyToNull(parsed.data.phone);
    const companyId = parsed.data.companyId ?? null;
    emitAfter("contact-created", {
      orgId,
      triggerType: "contact.created",
      eventId: newContactId,
      payload: {
        contact: {
          id: newContactId,
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          company_id: companyId,
        },
        org: { id: orgId, name: "", slug: orgSlug },
      },
    });
  }

  return { ok: true, data: { id: data.id } };
}

export async function updateContactAction(input: UpdateContactInput): Promise<ActionResult> {
  const parsed = updateContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const patch: TablesUpdate<"contacts"> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.email !== undefined) patch.email = emptyToNull(parsed.data.email);
  if (parsed.data.phone !== undefined) patch.phone = emptyToNull(parsed.data.phone);
  if (parsed.data.title !== undefined) patch.title = emptyToNull(parsed.data.title);
  if (parsed.data.companyId !== undefined) patch.company_id = parsed.data.companyId;
  if (parsed.data.notes !== undefined) patch.notes = emptyToNull(parsed.data.notes);

  const { error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);

  if (error) {
    logError("contacts.update", error);
    return { ok: false, error: "Não consegui salvar. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/contatos`);
  revalidatePath(`/app/${parsed.data.orgSlug}/contatos/${parsed.data.id}`);
  if (parsed.data.companyId) {
    revalidatePath(`/app/${parsed.data.orgSlug}/empresas/${parsed.data.companyId}`);
  }
  return { ok: true };
}

export async function deleteContactAction(input: DeleteContactInput): Promise<ActionResult> {
  const parsed = deleteContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);

  if (error) {
    logError("contacts.delete", error);
    return { ok: false, error: "Não consegui excluir. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/contatos`);
  return { ok: true };
}
