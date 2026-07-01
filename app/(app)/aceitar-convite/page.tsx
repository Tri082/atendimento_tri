import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AcceptForm } from "./accept-form";

type Props = { searchParams: Promise<{ token?: string }> };

export const metadata = { title: "Aceitar convite" };

const ROLE_LABEL: Record<"owner" | "admin" | "member", string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
};

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) redirect("/");

  const user = await getCurrentUser();

  const supabase = await createClient();
  const { data: invite } = await supabase
    .from("invitations")
    .select(
      "email, role, expires_at, accepted_at, organization_id, organization:organizations(name, slug)",
    )
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return (
      <Centered>
        <h1 className="font-semibold text-2xl">Convite inválido</h1>
        <p className="text-muted-foreground text-sm">
          Esse link de convite não existe ou foi cancelado.
        </p>
      </Centered>
    );
  }

  if (invite.accepted_at) {
    return (
      <Centered>
        <h1 className="font-semibold text-2xl">Convite já aceito</h1>
        <Button render={<Link href="/" />} nativeButton={false}>
          Ir para o app
        </Button>
      </Centered>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <Centered>
        <h1 className="font-semibold text-2xl">Convite expirado</h1>
        <p className="text-muted-foreground text-sm">Peça um novo convite ao admin.</p>
      </Centered>
    );
  }

  const org = invite.organization as unknown as { name: string; slug: string };

  if (!user) {
    return (
      <Centered>
        <h1 className="font-semibold text-2xl">Você foi convidado para {org.name}</h1>
        <p className="text-muted-foreground text-sm">Faça login ou crie conta para aceitar.</p>
        <div className="flex flex-col gap-2">
          <Button
            render={<Link href={`/signup?invite=${token}`} />}
            nativeButton={false}
            className="w-full"
          >
            Criar conta
          </Button>
          <Button
            render={<Link href={`/login?invite=${token}`} />}
            nativeButton={false}
            variant="outline"
            className="w-full"
          >
            Entrar
          </Button>
        </div>
      </Centered>
    );
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <Centered>
        <h1 className="font-semibold text-2xl">Email errado</h1>
        <p className="text-muted-foreground text-sm">
          Esse convite é para outro email. Faça logout e entre com o email correto.
        </p>
      </Centered>
    );
  }

  // R4-HIGH-6: lê role atual (se já é membro) pra mostrar delta na UI.
  // Evita "silent upgrade" — user vê explícito que vai virar admin.
  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", invite.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const inviteRole = invite.role as "admin" | "member";
  const currentRole = existingMembership?.role as "owner" | "admin" | "member" | undefined;
  const isUpgrade = currentRole === "member" && inviteRole === "admin";
  const isNoOp =
    currentRole === inviteRole ||
    currentRole === "owner" ||
    (currentRole === "admin" && inviteRole === "member");

  return (
    <Centered>
      <h1 className="font-semibold text-2xl">Você foi convidado para {org.name}</h1>
      <p className="text-muted-foreground text-sm">
        Role oferecido: <strong className="text-foreground">{ROLE_LABEL[inviteRole]}</strong>
      </p>

      {currentRole && (
        <div className="rounded border border-border bg-card/40 p-3 text-left text-sm">
          {isUpgrade ? (
            <p>
              Você já é <strong>{ROLE_LABEL[currentRole]}</strong> dessa organização. Aceitar este
              convite vai te <strong>promover a Admin</strong>.
            </p>
          ) : isNoOp ? (
            <p>
              Você já é <strong>{ROLE_LABEL[currentRole]}</strong> dessa organização. Aceitar apenas
              marca o convite como recebido — seu role não muda.
            </p>
          ) : null}
        </div>
      )}

      <AcceptForm token={token} orgName={org.name} />
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">{children}</div>
    </div>
  );
}
