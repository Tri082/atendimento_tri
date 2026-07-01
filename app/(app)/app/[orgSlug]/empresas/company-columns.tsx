"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CompanyWithCounts } from "@/lib/companies/queries";

const LIFECYCLE_LABEL: Record<CompanyWithCounts["lifecycle"], string> = {
  client: "Cliente",
  prospect: "Prospect",
  lead: "Lead",
};

const LIFECYCLE_VARIANT: Record<
  CompanyWithCounts["lifecycle"],
  "default" | "secondary" | "outline"
> = {
  client: "default",
  prospect: "secondary",
  lead: "outline",
};

export function getCompanyColumns(orgSlug: string): ColumnDef<CompanyWithCounts>[] {
  return [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <Link
          href={`/app/${orgSlug}/empresas/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "lifecycle",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={LIFECYCLE_VARIANT[row.original.lifecycle]}>
          {LIFECYCLE_LABEL[row.original.lifecycle]}
        </Badge>
      ),
    },
    {
      accessorKey: "contactCount",
      header: "Contatos",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.contactCount}</span>,
    },
    {
      accessorKey: "openDealCount",
      header: "Deals abertos",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.openDealCount}</span>,
    },
  ];
}
