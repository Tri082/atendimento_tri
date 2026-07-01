import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app/header";
import { AppSidebar } from "@/components/app/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireOrgMember } from "@/lib/auth/guards";
import { getUserOrgs } from "@/lib/orgs/queries";
import { createClient } from "@/lib/supabase/server";

// M-14: páginas autenticadas sempre dinâmicas, com `Cache-Control: private,
// no-store` herdado do response (Next adiciona em rotas dynamic). Sem isso,
// proxies CDN podem cachear HTML com dados do user.
export const dynamic = "force-dynamic";

type Props = {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
};

export default async function AppLayout({ children, params }: Props) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireOrgMember({ orgSlug });
  const orgs = await getUserOrgs(user.id);

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) notFound();

  return (
    // `h-svh overflow-hidden` força o wrapper a respeitar a altura do
    // viewport — sem isso ele usa só `min-h-svh` e expande quando uma
    // página (inbox/kanban) tenta usar `flex-1` no inner, empurrando o
    // scroll pra body inteira.
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar
        orgSlug={orgSlug}
        currentOrg={{
          id: org.id,
          slug: org.slug,
          name: org.name,
          logo_url: org.logo_url,
        }}
        orgs={orgs.map((m) => m.organization)}
        currentRole={role}
      />
      <SidebarInset className="min-w-0">
        <AppHeader
          orgSlug={orgSlug}
          user={{
            fullName: profile.full_name,
            email: user.email ?? "",
            avatarUrl: profile.avatar_url,
          }}
        />
        {/* `min-h-0` permite páginas que usam `flex-1` no filho (inbox, */}
        {/* kanban) claim altura exata e fazer scroll interno em vez de */}
        {/* empurrar o scroll pra body inteira. `overflow-y-auto` garante */}
        {/* que páginas longas (form de automação, settings) tenham scroll */}
        {/* natural — inbox/kanban usam scroll interno próprio em h-full */}
        {/* então a barra do main não duplica. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 pb-24">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
