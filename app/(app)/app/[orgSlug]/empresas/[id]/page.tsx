import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagsSection } from "@/components/app/tags-section";
import { requireOrgMember } from "@/lib/auth/guards";
import {
  getCompany,
  getCompanyLifecycle,
  getCompanyTasks,
  listCompanyDocuments,
} from "@/lib/companies/queries";
import { CompanyContactsPanel } from "./company-contacts-panel";
import { CompanyDealsPanel } from "./company-deals-panel";
import { CompanyDocuments } from "./company-documents";
import { CompanyForm } from "./company-form";
import { CompanyNotes } from "./company-notes";
import { CompanyTasksPanel } from "./company-tasks-panel";

type Props = { params: Promise<{ orgSlug: string; id: string }> };

export const metadata = { title: "Empresa" };

const LIFECYCLE_LABEL = {
  client: "Cliente",
  prospect: "Prospect",
  lead: "Lead",
} as const;
const LIFECYCLE_VARIANT = {
  client: "default",
  prospect: "secondary",
  lead: "outline",
} as const;

export default async function CompanyDetailPage({ params }: Props) {
  const { orgSlug, id } = await params;
  const { org, role } = await requireOrgMember({ orgSlug });
  const company = await getCompany(org.id, id);
  if (!company) notFound();

  const [lifecycle, docs, tasks] = await Promise.all([
    getCompanyLifecycle(org.id, id),
    listCompanyDocuments(org.id, id),
    getCompanyTasks(org.id, id),
  ]);

  const canDelete = role === "owner" || role === "admin";

  return (
    <div className="space-y-8">
      <Button
        render={<Link href={`/app/${orgSlug}/empresas`} />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Voltar pra empresas
      </Button>

      <div className="space-y-1.5">
        <span className="label-mono">/ empresa #{company.id.slice(0, 8)}</span>
        <h1 className="font-semibold text-3xl tracking-tight">{company.name}</h1>
        <Badge variant={LIFECYCLE_VARIANT[lifecycle]}>{LIFECYCLE_LABEL[lifecycle]}</Badge>
      </div>

      <Card>
        <CardContent className="p-4">
          <TagsSection
            orgId={org.id}
            orgSlug={orgSlug}
            entityType="company"
            entityId={company.id}
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
              <CompanyForm
                orgSlug={orgSlug}
                canDelete={canDelete}
                company={{ id: company.id, name: company.name }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ anotacoes</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CompanyNotes
                orgSlug={orgSlug}
                companyId={company.id}
                initial={company.notes ?? ""}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ documentos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CompanyDocuments orgSlug={orgSlug} companyId={company.id} initial={docs} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ deals</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CompanyDealsPanel orgSlug={orgSlug} orgId={org.id} companyId={company.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ contatos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CompanyContactsPanel orgSlug={orgSlug} orgId={org.id} companyId={company.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ tarefas</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CompanyTasksPanel orgSlug={orgSlug} companyId={company.id} tasks={tasks} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
