import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagsSection } from "@/components/app/tags-section";
import { requireOrgMember } from "@/lib/auth/guards";
import { getCompanies } from "@/lib/companies/queries";
import { getContact, getContactDeals, getContactTasks } from "@/lib/contacts/queries";
import { ContactDealsPanel } from "./contact-deals-panel";
import { ContactForm } from "./contact-form";
import { ContactNotes } from "./contact-notes";
import { ContactTasksPanel } from "./contact-tasks-panel";

type Props = { params: Promise<{ orgSlug: string; id: string }> };

export const metadata = { title: "Contato" };

export default async function ContactDetailPage({ params }: Props) {
  const { orgSlug, id } = await params;
  const { org, role } = await requireOrgMember({ orgSlug });
  const contact = await getContact(org.id, id);
  if (!contact) notFound();

  const [deals, tasks, companies] = await Promise.all([
    getContactDeals(org.id, id),
    getContactTasks(org.id, id),
    getCompanies(org.id),
  ]);

  const canDelete = role === "owner" || role === "admin";

  return (
    <div className="space-y-8">
      <Button
        render={<Link href={`/app/${orgSlug}/contatos`} />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Voltar pra contatos
      </Button>

      <div className="space-y-1.5">
        <span className="label-mono">/ contato #{contact.id.slice(0, 8)}</span>
        <h1 className="font-semibold text-3xl tracking-tight">{contact.name}</h1>
        {contact.title && (
          <p className="font-mono text-muted-foreground text-xs">{contact.title}</p>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <TagsSection
            orgId={org.id}
            orgSlug={orgSlug}
            entityType="contact"
            entityId={contact.id}
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
              <ContactForm
                orgSlug={orgSlug}
                canDelete={canDelete}
                companies={companies.map((c) => ({ id: c.id, name: c.name }))}
                contact={{
                  id: contact.id,
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone,
                  title: contact.title,
                  companyId: contact.company_id,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ anotacoes</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ContactNotes
                orgSlug={orgSlug}
                contactId={contact.id}
                initial={contact.notes ?? ""}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ deals deste contato</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ContactDealsPanel orgSlug={orgSlug} deals={deals} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 bg-card/40 py-3">
              <CardTitle className="label-mono text-[10px]">/ tarefas</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ContactTasksPanel
                orgSlug={orgSlug}
                contactId={contact.id}
                companyId={contact.company_id}
                tasks={tasks}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
