import { requireOrgMember } from "@/lib/auth/guards";
import { getCompanies } from "@/lib/companies/queries";
import { getDealKpis, getDealsGroupedByStage } from "@/lib/deals/queries";
import { KanbanBoard } from "./kanban-board";
import { KpiStrip } from "./kpi-strip";
import { NewDealDialog } from "./new-deal-dialog";

type Props = { params: Promise<{ orgSlug: string }> };

export const metadata = { title: "Deals" };

export default async function DealsPage({ params }: Props) {
  const { orgSlug } = await params;
  const { org } = await requireOrgMember({ orgSlug });

  const [grouped, kpis, companies] = await Promise.all([
    getDealsGroupedByStage(org.id),
    getDealKpis(org.id),
    getCompanies(org.id),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="label-mono">/ deals</span>
          <h1 className="font-semibold text-3xl tracking-tight">Deals</h1>
          <p className="text-muted-foreground text-sm">Seus projetos e negociações em andamento.</p>
        </div>
        <NewDealDialog
          orgSlug={orgSlug}
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>

      <KpiStrip kpis={kpis} />

      <KanbanBoard orgSlug={orgSlug} initial={grouped} />
    </div>
  );
}
