import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactWithCompany = Contact & { companyName: string | null };

export async function getContacts(orgId: string): Promise<Contact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getContactsWithCompany(orgId: string): Promise<ContactWithCompany[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, company:companies(name)")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { company, ...rest } = row as Contact & { company: { name: string } | null };
    return { ...rest, companyName: company?.name ?? null };
  });
}

export async function getContact(orgId: string, id: string): Promise<Contact | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type ContactDeal = Database["public"]["Tables"]["deals"]["Row"];

export async function getContactDeals(orgId: string, contactId: string): Promise<ContactDeal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deal_contacts")
    .select("deal:deals!inner(*)")
    .eq("contact_id", contactId);
  if (error) throw error;
  return (data ?? [])
    .map((row) => (row as { deal: ContactDeal | null }).deal)
    .filter((d): d is ContactDeal => d !== null && d.organization_id === orgId);
}

export async function getContactTasks(orgId: string, contactId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", orgId)
    .eq("contact_id", contactId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
