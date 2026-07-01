import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgMember } from "@/lib/auth/guards";
import { getOrgInvitations, getOrgMembers } from "@/lib/orgs/queries";
import { InvitationsList } from "./invitations-list";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MembersList } from "./members-list";

type Props = { params: Promise<{ orgSlug: string }> };

export const metadata = { title: "Membros" };

export default async function MembersPage({ params }: Props) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireOrgMember({ orgSlug });
  const canManage = role === "owner" || role === "admin";

  const [members, invitations] = await Promise.all([
    getOrgMembers(org.id),
    canManage ? getOrgInvitations(org.id) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <span className="label-mono">/ membros</span>
          <h1 className="font-semibold text-3xl tracking-tight">Membros</h1>
          <p className="text-muted-foreground text-sm">Quem tem acesso a este workspace.</p>
        </div>
        {canManage && <InviteMemberDialog orgSlug={orgSlug} />}
      </div>

      {/* Members card */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="flex items-center gap-2">
            <span className="label-mono">/ ativos</span>
            <span className="font-medium text-sm">
              {members.length}{" "}
              <span className="text-muted-foreground">
                {members.length === 1 ? "membro" : "membros"}
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MembersList
            orgSlug={orgSlug}
            currentUserId={user.id}
            canManage={canManage}
            members={members}
          />
        </CardContent>
      </Card>

      {/* Invitations card */}
      {canManage && invitations.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card/40 py-3">
            <CardTitle className="flex items-center gap-2">
              <span className="label-mono">/ pendentes</span>
              <span className="font-medium text-sm">
                {invitations.length}{" "}
                <span className="text-muted-foreground">
                  {invitations.length === 1 ? "convite" : "convites"}
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <InvitationsList orgSlug={orgSlug} invitations={invitations} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
