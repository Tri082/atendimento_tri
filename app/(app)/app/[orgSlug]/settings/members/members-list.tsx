"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { changeMemberRoleAction, removeMemberAction } from "@/lib/members/actions";
import type { Member } from "@/lib/orgs/queries";

type Props = {
  orgSlug: string;
  currentUserId: string;
  canManage: boolean;
  members: Member[];
};

const roleLabels: Record<Member["role"], string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
};

export function MembersList({ orgSlug, currentUserId, canManage, members }: Props) {
  const [pending, startTransition] = useTransition();

  function handleRoleChange(membershipId: string, newRole: "admin" | "member") {
    startTransition(async () => {
      const result = await changeMemberRoleAction({ orgSlug, membershipId, newRole });
      if (!result.ok) toast.error(result.error);
      else toast.success("Role atualizado");
    });
  }

  function handleRemove(membershipId: string) {
    startTransition(async () => {
      const result = await removeMemberAction({ orgSlug, membershipId });
      if (!result.ok) toast.error(result.error);
      else toast.success("Membro removido");
    });
  }

  return (
    <ul className="divide-y divide-border/60">
      {members.map((m) => {
        const isSelf = m.user_id === currentUserId;
        const display = m.profile.full_name ?? "Sem nome";
        const showActions = canManage && m.role !== "owner" && !isSelf;
        const isOwner = m.role === "owner";

        return (
          <li
            key={m.membership_id}
            className="group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-card/40"
          >
            <div className="relative">
              <Avatar className="h-9 w-9 ring-1 ring-border">
                <AvatarImage src={m.profile.avatar_url ?? undefined} alt={display} />
                <AvatarFallback className="bg-muted text-foreground/70">
                  {display.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-sm">{display}</p>
                {isSelf && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary uppercase tracking-wider">
                    você
                  </span>
                )}
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">
                membro desde{" "}
                {new Date(m.joined_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <Badge
              variant={isOwner ? "default" : "outline"}
              className={
                isOwner ? "bg-primary/15 text-primary hover:bg-primary/20 border-primary/30" : ""
              }
            >
              {roleLabels[m.role]}
            </Badge>

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Ações"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  }
                  disabled={pending}
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {m.role !== "admin" && (
                    <DropdownMenuItem onClick={() => handleRoleChange(m.membership_id, "admin")}>
                      Tornar admin
                    </DropdownMenuItem>
                  )}
                  {m.role !== "member" && (
                    <DropdownMenuItem onClick={() => handleRoleChange(m.membership_id, "member")}>
                      Tornar membro
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleRemove(m.membership_id)}
                    className="text-destructive"
                  >
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        );
      })}
    </ul>
  );
}
