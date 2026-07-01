"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { ContactWithCompany } from "@/lib/contacts/queries";

export function getContactColumns(orgSlug: string): ColumnDef<ContactWithCompany>[] {
  return [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <Link
          href={`/app/${orgSlug}/contatos/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "title",
      header: "Cargo",
      cell: ({ row }) => <span className="text-sm">{row.original.title ?? "—"}</span>,
    },
    {
      accessorKey: "companyName",
      header: "Empresa",
      cell: ({ row }) => <span className="text-sm">{row.original.companyName ?? "—"}</span>,
    },
    {
      accessorKey: "phone",
      header: "Telefone",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.phone ?? "—"}</span>,
    },
    {
      accessorKey: "email",
      header: "E-mail",
      cell: ({ row }) => <span className="text-sm">{row.original.email ?? "—"}</span>,
    },
  ];
}
