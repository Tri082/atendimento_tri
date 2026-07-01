import { requireOrgMember } from "@/lib/auth/guards";
import { getCompaniesWithCounts } from "@/lib/companies/queries";
import { CompaniesTable } from "./companies-table";
import { NewCompanyDialog } from "./new-company-dialog";

type Props = { params: Promise<{ orgSlug: string }> };

export const metadata = { title: "Empresas" };

export default async function EmpresasPage({ params }: Props) {
  const { orgSlug } = await params;
  const { org } = await requireOrgMember({ orgSlug });
  const companies = await getCompaniesWithCounts(org.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="label-mono">/ empresas</span>
          <h1 className="font-semibold text-3xl tracking-tight">Empresas</h1>
          <p className="text-muted-foreground text-sm">Empresas que você atende.</p>
        </div>
        <NewCompanyDialog orgSlug={orgSlug} />
      </div>

      <CompaniesTable orgSlug={orgSlug} companies={companies} />
    </div>
  );
}
