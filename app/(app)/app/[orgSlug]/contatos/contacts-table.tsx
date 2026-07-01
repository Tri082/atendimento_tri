"use client";

import { UsersIcon } from "lucide-react";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import type { ContactWithCompany } from "@/lib/contacts/queries";
import { getContactColumns } from "./contact-columns";

type Props = { orgSlug: string; contacts: ContactWithCompany[] };

export function ContactsTable({ orgSlug, contacts }: Props) {
  return (
    <DataTable
      columns={getContactColumns(orgSlug)}
      data={contacts}
      searchColumn="name"
      searchPlaceholder="Buscar por nome..."
      empty={
        <EmptyState
          icon={UsersIcon}
          title="Nenhum contato ainda"
          description="Crie seu primeiro contato clicando em 'Novo contato' acima."
        />
      }
    />
  );
}
