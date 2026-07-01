import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyLifecycle = "client" | "prospect" | "lead";

export async function getCompanies(orgId: string): Promise<Company[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCompany(orgId: string, id: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDefaultCompanyId(orgId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("organization_id", orgId)
    .limit(2);
  if (error) throw error;
  if (!data || data.length !== 1) return null;
  return data[0]!.id;
}

export type CompanyWithCounts = Company & {
  contactCount: number;
  openDealCount: number;
  lifecycle: CompanyLifecycle;
};

export async function getCompaniesWithCounts(orgId: string): Promise<CompanyWithCounts[]> {
  const supabase = await createClient();
  const [companiesRes, contactsRes, dealsRes] = await Promise.all([
    supabase.from("companies").select("*").eq("organization_id", orgId).order("name"),
    supabase
      .from("contacts")
      .select("company_id")
      .eq("organization_id", orgId)
      .not("company_id", "is", null),
    supabase.from("deals").select("company_id, stage").eq("organization_id", orgId),
  ]);
  if (companiesRes.error) throw companiesRes.error;
  if (contactsRes.error) throw contactsRes.error;
  if (dealsRes.error) throw dealsRes.error;

  const contactCounts = new Map<string, number>();
  for (const c of contactsRes.data ?? []) {
    if (c.company_id) {
      contactCounts.set(c.company_id, (contactCounts.get(c.company_id) ?? 0) + 1);
    }
  }

  const openDealCounts = new Map<string, number>();
  const wonByCompany = new Map<string, boolean>();
  const openByCompany = new Map<string, boolean>();
  for (const d of dealsRes.data ?? []) {
    if (d.stage !== "won" && d.stage !== "lost") {
      openDealCounts.set(d.company_id, (openDealCounts.get(d.company_id) ?? 0) + 1);
      openByCompany.set(d.company_id, true);
    }
    if (d.stage === "won") wonByCompany.set(d.company_id, true);
  }

  return (companiesRes.data ?? []).map((c) => ({
    ...c,
    contactCount: contactCounts.get(c.id) ?? 0,
    openDealCount: openDealCounts.get(c.id) ?? 0,
    lifecycle: wonByCompany.get(c.id) ? "client" : openByCompany.get(c.id) ? "prospect" : "lead",
  }));
}

export async function getCompanyLifecycle(
  orgId: string,
  companyId: string,
): Promise<CompanyLifecycle> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("stage")
    .eq("organization_id", orgId)
    .eq("company_id", companyId);
  if (error) throw error;
  const stages = data ?? [];
  if (stages.some((d) => d.stage === "won")) return "client";
  if (stages.some((d) => d.stage !== "lost")) return "prospect";
  return "lead";
}

export type CompanyDocument = {
  name: string;
  path: string;
  size: number;
  createdAt: string;
};

export async function listCompanyDocuments(
  orgId: string,
  companyId: string,
): Promise<CompanyDocument[]> {
  const supabase = await createClient();
  const prefix = `${orgId}/${companyId}`;
  const { data, error } = await supabase.storage
    .from("company-documents")
    .list(prefix, { sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;
  return (data ?? [])
    .filter((entry) => entry.name && entry.id)
    .map((entry) => ({
      name: entry.name,
      path: `${prefix}/${entry.name}`,
      size: entry.metadata?.size ?? 0,
      createdAt: entry.created_at ?? new Date().toISOString(),
    }));
}

export async function getCompanyTasks(orgId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", orgId)
    .eq("company_id", companyId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export type CompanyDealItem = Database["public"]["Tables"]["deals"]["Row"];

export async function getCompanyDeals(
  orgId: string,
  companyId: string,
): Promise<CompanyDealItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", orgId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
