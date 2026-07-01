"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  type NavGroup,
  navGroupLabels,
  navGroupOrder,
  navItems as configuredNavItems,
} from "@/config/nav.config";
import Link from "next/link";
import { OrgSwitcher, type OrgSwitcherOrg } from "./org-switcher";

type Props = {
  orgSlug: string;
  currentOrg: OrgSwitcherOrg;
  orgs: OrgSwitcherOrg[];
  currentRole: "owner" | "admin" | "member";
};

type NavRenderItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AppSidebar({ orgSlug, currentOrg, orgs, currentRole }: Props) {
  const pathname = usePathname();
  const base = `/app/${orgSlug}`;

  const itemsByGroup = new Map<NavGroup, NavRenderItem[]>();
  for (const item of configuredNavItems) {
    if (item.roles && !item.roles.includes(currentRole)) continue;
    const renderItem: NavRenderItem = {
      href: `${base}${item.path}`,
      label: item.label,
      icon: item.icon,
    };
    const bucket = itemsByGroup.get(item.group);
    if (bucket) bucket.push(renderItem);
    else itemsByGroup.set(item.group, [renderItem]);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border py-1">
        <OrgSwitcher current={currentOrg} orgs={orgs} />
      </SidebarHeader>
      <SidebarContent>
        {navGroupOrder.map((group) => {
          const items = itemsByGroup.get(group);
          if (!items || items.length === 0) return null;
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel className="label-mono px-3 pt-1 text-[10px]">
                {navGroupLabels[group]}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-1.5">
          <span className="label-mono">v1.0</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavLink({ item, pathname }: { item: NavRenderItem; pathname: string }) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} />}
        isActive={active}
        tooltip={item.label}
        className="relative h-8"
      >
        {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-primary" />}
        <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
        <span className={active ? "font-medium text-foreground" : ""}>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
