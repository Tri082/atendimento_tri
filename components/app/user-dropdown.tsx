"use client";

import { LogOutIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";

type Props = {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  orgSlug: string;
};

export function UserDropdown({ fullName, email, avatarUrl, orgSlug }: Props) {
  const [pending, startTransition] = useTransition();
  const display = fullName ?? email.split("@")[0] ?? email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Menu do usuário" />}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl ?? undefined} alt={display} />
          <AvatarFallback>{display.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="truncate text-sm">{display}</span>
              <span className="truncate text-muted-foreground text-xs">{email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`/app/${orgSlug}/settings/profile`} />}>
          <UserIcon className="mr-2 h-4 w-4" />
          Meu perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            startTransition(() => signOutAction());
          }}
          disabled={pending}
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          {pending ? "Saindo..." : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
