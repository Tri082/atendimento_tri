import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getOrgBySlug, getUserOrgs } from "@/lib/orgs/queries";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type OrgRole = Database["public"]["Enums"]["org_role"];

export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireOrgMember(opts: { orgSlug: string }) {
  const user = await requireUser();
  const membership = await getOrgBySlug(opts.orgSlug, user.id);

  if (!membership) {
    const allOrgs = await getUserOrgs(user.id);
    if (allOrgs.length === 0) redirect("/onboarding");
    redirect(`/app/${allOrgs[0]!.organization.slug}/dashboard`);
  }

  return { user, org: membership.organization, role: membership.role };
}

export async function requireOrgRole(opts: { orgSlug: string; roles: OrgRole[] }) {
  const ctx = await requireOrgMember({ orgSlug: opts.orgSlug });
  if (!opts.roles.includes(ctx.role)) {
    redirect(`/app/${opts.orgSlug}/dashboard`);
  }
  return ctx;
}
