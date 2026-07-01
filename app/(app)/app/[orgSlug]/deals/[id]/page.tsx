import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagsSection } from "@/components/app/tags-section";
import { requireOrgMember } from "@/lib/auth/guards";
import { getCompanies } from "@/lib/companies/queries";
import { getContacts } from "@/lib/contacts/queries";
import { getDeal, getDealContacts, getDealTasks, listDealDocuments } from "@/lib/deals/queries";
import { STAGE_LABELS } from "@/lib/deals/stages";
import { DealContactsPanel } from "./deal-contacts-panel";
import { DealDocuments } from "./deal-documents";
import { DealForm } from "./deal-form";
import { DealNotes } from "./deal-notes";
import { DealTasksPanel } from "./deal-tasks-panel";

type Props = { params: Promise<{ orgSlug: string; id: string }> };

export const metadata = { title: "Deal" };

function formatBrl(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export default async function DealDetailPage({ params }: Props) {
  const { orgSlug, id } = await params;
  const { org, role } = await requireOrgMember({ orgSlug });
  const deal = await getDeal(org.id, id);
  if (!deal) notFound();

  const [contacts, allContacts, companies, docs, tasks] = await Promise.all([
    getDealContacts(org.id, id),
    getContacts(org.id),
    getCompanies(org.id),
    listDealDocuments(org.id, id),
    getDealTasks(org.id, id),
  ]);

  const canDelete = role === "owner" || role === "admin";
  const companyOptions = companies.map((c) => ({ id: c.id, name: c.name }));
  const contactOptions = allContacts.map((c) => ({
    id: c.id,
    name: c.name,
    companyId: c.company_id,
    companyName: companies.find((co) => co.id === c.company_id)?.name ?? null,
  }));

  return (
    <div className="space-y-8">
      <Button
        render={<Link href={`/app/${orgSlug}/deals`} />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Voltar pra deals
      </Button>

      <div className="space-y-1.5">
        <span className="label-mono">/ deal #{deal.id.slice(0, 8)}</span>
        <h1 className="font-semibold text-3xl tracking-tight">{deal.name}</h1>
        <p className="font-mono text-muted-foreground text-xs">
          {STAGE_LABELS[deal.stage]} · {formatBrl(deal.value)}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <TagsSection
            orgId={org.id}
            orgSlug={orgSlug}
            entityType="deal"
            entityId={deal.id}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ detalhes</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DealForm
                orgSlug={orgSlug}
                canDelete={canDelete}
                companies={companyOptions}
                deal={{
                  id: deal.id,
                  name: deal.name,
                  stage: deal.stage,
                  value: deal.value,
                  expectedCloseDate: deal.expected_close_date,
                  lostReason: deal.lost_reason,
                  companyId: deal.company_id,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ anotacoes</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DealNotes orgSlug={orgSlug} dealId={deal.id} initial={deal.notes ?? ""} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ contatos vinculados</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DealContactsPanel
                orgSlug={orgSlug}
                dealId={deal.id}
                companyId={deal.company_id}
                vinculados={contacts}
                allContacts={contactOptions}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ documentos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DealDocuments orgSlug={orgSlug} dealId={deal.id} initial={docs} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ tarefas</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DealTasksPanel
                orgSlug={orgSlug}
                dealId={deal.id}
                companyId={deal.company_id}
                tasks={tasks}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
