import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { resolveOrgLogoUrl } from "./storage";

export type OrgMembership = {
  organization_id: string;
  role: Database["public"]["Enums"]["org_role"];
  organization: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
  };
};

/**
 * Lista todas as orgs do usuário autenticado, com role em cada.
 * NEW-HIGH-8: resolve logo path → signed URL (bucket privado).
 */
export async function getUserOrgs(userId: string): Promise<OrgMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("organization_id, role, organization:organizations(id, slug, name, logo_url)")
    .eq("user_id", userId);

  if (error) throw error;

  const raw = (data ?? []) as unknown as OrgMembership[];
  return Promise.all(
    raw.map(async (m) => ({
      ...m,
      organization: {
        ...m.organization,
        logo_url: await resolveOrgLogoUrl(m.organization.logo_url),
      },
    })),
  );
}

/**
 * Busca uma org pelo slug e valida que o usuário é membro.
 * Retorna null se não for membro (ou org não existir).
 */
export async function getOrgBySlug(slug: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "role, organization:organizations!inner(id, slug, name, logo_url, created_by, created_at)",
    )
    .eq("user_id", userId)
    .eq("organization.slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const org = data.organization as unknown as {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    created_by: string | null;
    created_at: string;
  };
  return {
    role: data.role,
    organization: {
      ...org,
      logo_url: await resolveOrgLogoUrl(org.logo_url),
    },
  };
}

export type Member = {
  membership_id: string;
  user_id: string;
  role: Database["public"]["Enums"]["org_role"];
  joined_at: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  };
};

export async function getOrgMembers(orgId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("id, user_id, role, created_at, profile:profiles!inner(full_name, avatar_url)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((m) => ({
    membership_id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.created_at,
    profile: m.profile as unknown as {
      full_name: string | null;
      avatar_url: string | null;
    },
  }));
}

export type Invitation = {
  id: string;
  email: string;
  role: Database["public"]["Enums"]["org_role"];
  token: string;
  invited_by: string | null;
  expires_at: string;
  created_at: string;
};

export async function getOrgInvitations(orgId: string): Promise<Invitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, token, invited_by, expires_at, created_at")
    .eq("organization_id", orgId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
