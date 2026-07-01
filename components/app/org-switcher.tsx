"use client";

import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

export type OrgSwitcherOrg = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
};

type Props = {
  current: OrgSwitcherOrg;
  orgs: OrgSwitcherOrg[];
};

export function OrgSwitcher({ current, orgs }: Props) {
  const router = useRouter();
  const { state } = useSidebar();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent gap-2.5" />
        }
      >
        <Avatar className="h-8 w-8 rounded-lg ring-1 ring-primary/30">
          <AvatarImage src={current.logo_url ?? undefined} alt={current.name} />
          <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-semibold">
            {current.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {state === "expanded" && (
          <>
            <div className="flex flex-1 flex-col text-left text-sm leading-tight">
              <span className="truncate font-semibold tracking-tight">{current.name}</span>
              <span className="truncate font-mono text-muted-foreground text-[10px]">
                /{current.slug}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">Seus workspaces</DropdownMenuLabel>
        </DropdownMenuGroup>
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => router.push(`/app/${org.slug}/dashboard`)}
            className="gap-2"
          >
            <Avatar className="h-5 w-5 rounded-sm">
              <AvatarImage src={org.logo_url ?? undefined} />
              <AvatarFallback className="rounded-sm bg-primary/20 text-primary text-xs">
                {org.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === current.id && <CheckIcon className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/onboarding?new=1" className="gap-2" />}>
          <PlusIcon className="h-4 w-4" />
          Novo workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
