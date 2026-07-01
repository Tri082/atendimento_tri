"use server";

import { revalidatePath } from "next/cache";
import { requireOrgRole, requireUser } from "@/lib/auth/guards";
import { getEmailProvider } from "@/lib/email";
import { InvitationEmail } from "@/lib/email/templates/invitation";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  type AcceptInvitationInput,
  acceptInvitationSchema,
  type CreateInvitationInput,
  createInvitationSchema,
} from "./schemas";

export async function createInvitationAction(
  input: CreateInvitationInput,
): Promise<{ ok: true; emailSent: boolean } | { ok: false; error: string }> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { user, org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });

  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: org.id,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error || !invitation) {
    if (error?.code === "23505") {
      return { ok: false, error: "Esse email já foi convidado" };
    }
    logError("invitations.create", error);
    return { ok: false, error: "Erro ao criar convite. Tente novamente." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const inviterName = profile?.full_name ?? user.email ?? "Alguém";

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/aceitar-convite?token=${invitation.token}`;

  const provider = getEmailProvider();
  const result = await provider.send({
    to: parsed.data.email,
    subject: `${inviterName} te convidou para ${org.name}`,
    react: InvitationEmail({ inviterName, orgName: org.name, acceptUrl }),
  });

  revalidatePath(`/app/${parsed.data.orgSlug}/settings/members`);
  return { ok: true, emailSent: result.ok };
}

export async function acceptInvitationAction(
  input: AcceptInvitationInput,
): Promise<{ ok: true; orgSlug: string } | { ok: false; error: string }> {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Token inválido" };
  }

  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("accept_invitation", { _token: parsed.data.token })
    .single();

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not found")) return { ok: false, error: "Convite não encontrado" };
    if (msg.includes("already accepted")) return { ok: false, error: "Convite já foi aceito" };
    if (msg.includes("expired")) return { ok: false, error: "Convite expirado" };
    if (msg.includes("different email")) {
      return {
        ok: false,
        error: "Esse convite é para outro email. Faça logout e entre com o email certo.",
      };
    }
    logError("invitations.accept", error);
    return { ok: false, error: "Falha ao aceitar convite. Tente novamente." };
  }

  if (!data?.slug) {
    return { ok: false, error: "Falha ao aceitar convite. Tente novamente." };
  }

  revalidatePath("/app", "layout");
  return { ok: true, orgSlug: data.slug };
}

/**
 * R3-BIZ-003: usa .select() pra detectar quando a policy bloqueia delete
 * (convite já aceito). Sem isso, action retorna ok:true falso.
 */
export async function revokeInvitationAction(
  orgSlug: string,
  invitationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("organization_id", org.id)
    .select("id");

  if (error) {
    logError("invitations.revoke", error);
    return { ok: false, error: "Falha ao revogar convite. Tente novamente." };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "Convite já foi aceito. Para remover acesso, vá em Membros.",
    };
  }

  revalidatePath(`/app/${orgSlug}/settings/members`);
  return { ok: true };
}
