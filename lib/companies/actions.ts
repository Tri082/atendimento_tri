"use server";

import { revalidatePath } from "next/cache";
import { requireOrgMember, requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/supabase";
import {
  type CreateCompanyInput,
  createCompanySchema,
  type DeleteCompanyInput,
  deleteCompanySchema,
  type UpdateCompanyInput,
  updateCompanySchema,
} from "./schemas";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function emptyToNull(v: string | undefined): string | null {
  return v === undefined || v === "" ? null : v;
}

export async function createCompanyAction(
  input: CreateCompanyInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .insert({
      organization_id: org.id,
      name: parsed.data.name,
      notes: emptyToNull(parsed.data.notes),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logError("companies.create", error);
    return { ok: false, error: "Não consegui criar a empresa. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/empresas`);
  return { ok: true, data: { id: data.id } };
}

export async function updateCompanyAction(input: UpdateCompanyInput): Promise<ActionResult> {
  const parsed = updateCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const patch: TablesUpdate<"companies"> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.notes !== undefined) patch.notes = emptyToNull(parsed.data.notes);

  const { error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);

  if (error) {
    logError("companies.update", error);
    return { ok: false, error: "Não consegui salvar. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/empresas`);
  revalidatePath(`/app/${parsed.data.orgSlug}/empresas/${parsed.data.id}`);
  return { ok: true };
}

export async function deleteCompanyAction(input: DeleteCompanyInput): Promise<ActionResult> {
  const parsed = deleteCompanySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();

  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);

  if (error) {
    logError("companies.delete", error);
    return { ok: false, error: "Não consegui excluir. Tenta de novo." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/empresas`);
  revalidatePath(`/app/${parsed.data.orgSlug}/deals`);
  revalidatePath(`/app/${parsed.data.orgSlug}/contatos`);
  return { ok: true };
}
