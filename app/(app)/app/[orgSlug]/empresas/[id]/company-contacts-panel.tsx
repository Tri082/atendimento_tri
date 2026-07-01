import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

type Props = { orgSlug: string; orgId: string; companyId: string };

async function getContactsOfCompany(orgId: string, companyId: string): Promise<Contact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", orgId)
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function CompanyContactsPanel({ orgSlug, orgId, companyId }: Props) {
  const contacts = await getContactsOfCompany(orgId, companyId);

  return (
    <div className="space-y-3">
      {contacts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum contato vinculado a essa empresa ainda.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={`/app/${orgSlug}/contatos/${c.id}`}
                  className="truncate font-medium text-sm hover:underline"
                >
                  {c.name}
                </Link>
                {c.title && <p className="text-muted-foreground text-xs">{c.title}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground text-xs">
        Pra criar um contato vinculado, vá em{" "}
        <Link href={`/app/${orgSlug}/contatos`} className="underline">
          Contatos
        </Link>{" "}
        e selecione essa empresa.
      </p>
    </div>
  );
}
