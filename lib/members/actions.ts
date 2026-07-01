"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrgMember, requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  type ChangeRoleInput,
  changeRoleSchema,
  type RemoveMemberInput,
  removeMemberSchema,
  type TransferOwnershipInput,
  transferOwnershipSchema,
} from "./schemas";

export async function changeMemberRoleAction(
  input: ChangeRoleInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("memberships")
    .select("role")
    .eq("id", parsed.data.membershipId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!target) return { ok: false, error: "Membro não encontrado" };
  if (target.role === "owner")
    return { ok: false, error: "Não dá pra mudar o role do dono. Use transferir propriedade." };

  const { error } = await supabase
    .from("memberships")
    .update({ role: parsed.data.newRole })
    .eq("id", parsed.data.membershipId);

  if (error) {
    logError("members.changeRole", error);
    return { ok: false, error: "Erro ao alterar role. Tente novamente." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/settings/members`);
  return { ok: true };
}

export async function removeMemberAction(
  input: RemoveMemberInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("memberships")
    .select("role")
    .eq("id", parsed.data.membershipId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!target) return { ok: false, error: "Membro não encontrado" };
  if (target.role === "owner") return { ok: false, error: "Não dá pra remover o dono" };

  const { error } = await supabase.from("memberships").delete().eq("id", parsed.data.membershipId);

  if (error) {
    logError("members.remove", error);
    return { ok: false, error: "Erro ao remover membro. Tente novamente." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/settings/members`);
  return { ok: true };
}

/**
 * R4-CRIT-2: RPC agora recebe `_org_id` explícito + filtra dentro do FOR
 * UPDATE. Action passa `org.id` obtido pelo requireOrgRole (validado).
 * Antes a RPC pegava qualquer membership owner do caller — bug que
 * transferia a org errada quando o user era owner de múltiplas.
 */
export async function transferOwnershipAction(
  input: TransferOwnershipInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = transferOwnershipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { user, org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner"],
  });

  if (user.id === parsed.data.targetUserId) {
    return { ok: false, error: "Você já é o dono" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_ownership", {
    _org_id: org.id,
    _target_user_id: parsed.data.targetUserId,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not a member")) return { ok: false, error: "Usuário não é membro" };
    if (msg.includes("cannot transfer to self")) return { ok: false, error: "Você já é o dono" };
    if (msg.includes("not owner")) return { ok: false, error: "Só o dono pode transferir" };
    logError("members.transfer", error);
    return { ok: false, error: "Falha ao transferir. Tente novamente." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/settings/members`);
  revalidatePath("/app", "layout");
  return { ok: true };
}

/**
 * R3-BIZ-005: self-leave para member não-owner.
 */
export async function leaveOrganizationAction(
  orgSlug: string,
): Promise<{ ok: false; error: string } | never> {
  const { user, org, role } = await requireOrgMember({ orgSlug });
  if (role === "owner") {
    return {
      ok: false,
      error: "Dono não pode sair. Transfira a propriedade primeiro.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("organization_id", org.id)
    .eq("user_id", user.id);

  if (error) {
    logError("members.leave", error);
    return { ok: false, error: "Falha ao sair do workspace. Tente novamente." };
  }

  revalidatePath("/app", "layout");
  redirect("/onboarding");
}
