"use client";

import { BuildingIcon } from "lucide-react";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import type { CompanyWithCounts } from "@/lib/companies/queries";
import { getCompanyColumns } from "./company-columns";

type Props = {
  orgSlug: string;
  companies: CompanyWithCounts[];
};

export function CompaniesTable({ orgSlug, companies }: Props) {
  return (
    <DataTable
      columns={getCompanyColumns(orgSlug)}
      data={companies}
      searchColumn="name"
      searchPlaceholder="Buscar por nome..."
      empty={
        <EmptyState
          icon={BuildingIcon}
          title="Nenhuma empresa ainda"
          description="Cadastre sua primeira empresa clicando em 'Nova empresa' acima."
        />
      }
    />
  );
}
