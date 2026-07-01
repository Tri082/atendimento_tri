import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { type DealStage, STAGE_ORDER } from "./stages";

export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type DealWithCompany = Deal & { companyName: string };

export async function getDeals(orgId: string): Promise<DealWithCompany[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*, company:companies!inner(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => {
    const { company, ...rest } = d as Deal & { company: { name: string } | null };
    return { ...rest, companyName: company?.name ?? "" };
  });
}

export async function getDeal(orgId: string, id: string): Promise<Deal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDealsGroupedByStage(
  orgId: string,
): Promise<Record<DealStage, DealWithCompany[]>> {
  const deals = await getDeals(orgId);
  const grouped = Object.fromEntries(
    STAGE_ORDER.map((s) => [s, [] as DealWithCompany[]]),
  ) as Record<DealStage, DealWithCompany[]>;
  for (const d of deals) grouped[d.stage].push(d);
  return grouped;
}

export type DealContact = Database["public"]["Tables"]["contacts"]["Row"];

export async function getDealContacts(orgId: string, dealId: string): Promise<DealContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deal_contacts")
    .select("contact:contacts!inner(*)")
    .eq("deal_id", dealId);
  if (error) throw error;
  return (data ?? [])
    .map((row) => (row as { contact: DealContact | null }).contact)
    .filter((c): c is DealContact => c !== null && c.organization_id === orgId);
}

export type DealKpis = {
  pipelineValue: number;
  wonThisMonth: number;
  inNegotiation: number;
};

export async function getDealKpis(orgId: string): Promise<DealKpis> {
  const supabase = await createClient();
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const firstOfMonthIso = firstOfMonth.toISOString().slice(0, 10);

  const [openRes, wonRes, negCountRes] = await Promise.all([
    supabase
      .from("deals")
      .select("value")
      .eq("organization_id", orgId)
      .not("stage", "in", "(won,lost)"),
    supabase
      .from("deals")
      .select("value")
      .eq("organization_id", orgId)
      .eq("stage", "won")
      .gte("actual_close_date", firstOfMonthIso),
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("stage", ["qualified", "proposal_sent", "negotiation"]),
  ]);

  if (openRes.error) throw openRes.error;
  if (wonRes.error) throw wonRes.error;
  if (negCountRes.error) throw negCountRes.error;

  const sumValue = (rows: { value: number | null }[]) =>
    rows.reduce((acc, r) => acc + (r.value ?? 0), 0);

  return {
    pipelineValue: sumValue(openRes.data ?? []),
    wonThisMonth: sumValue(wonRes.data ?? []),
    inNegotiation: negCountRes.count ?? 0,
  };
}

export type DealDocument = {
  name: string;
  path: string;
  size: number;
  createdAt: string;
};

export async function listDealDocuments(orgId: string, dealId: string): Promise<DealDocument[]> {
  const supabase = await createClient();
  const prefix = `${orgId}/${dealId}`;
  const { data, error } = await supabase.storage
    .from("deal-documents")
    .list(prefix, { sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;
  return (data ?? [])
    .filter((e) => e.name && e.id)
    .map((e) => ({
      name: e.name,
      path: `${prefix}/${e.name}`,
      size: e.metadata?.size ?? 0,
      createdAt: e.created_at ?? new Date().toISOString(),
    }));
}

export async function getDealTasks(orgId: string, dealId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", orgId)
    .eq("deal_id", dealId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
