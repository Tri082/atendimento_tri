import { TagsSection } from "@/components/app/tags-section";
import { createClient } from "@/lib/supabase/server";
import { ContactSummary } from "./contact-summary";
import { PromoteButton } from "./promote-button.client";
import { RelatedDeals } from "./related-deals";
import { RelatedTasks } from "./related-tasks";

interface Props {
  orgSlug: string;
  conversation: {
    id: string;
    contact_id: string | null;
    external_thread_id: string;
    display_name: string | null;
    organization_id: string;
    contact: { id: string; name: string; email: string | null; phone: string | null } | null;
  };
}

export async function ContextPanel({ orgSlug, conversation }: Props) {
  // Fetch options for the promote dialog only when needed (no contact linked yet)
  let contactOptions: { id: string; name: string; companyId: string | null; companyName: string | null }[] =
    [];
  let companyOptions: { id: string; name: string }[] = [];
  if (!conversation.contact_id) {
    const supabase = await createClient();
    const [contactsResp, companiesResp] = await Promise.all([
      supabase
        .from("contacts")
        .select("id, name, company_id, company:companies(name)")
        .eq("organization_id", conversation.organization_id)
        .order("name", { ascending: true })
        .limit(200),
      supabase
        .from("companies")
        .select("id, name")
        .eq("organization_id", conversation.organization_id)
        .order("name", { ascending: true })
        .limit(200),
    ]);
    contactOptions = (contactsResp.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      companyId: c.company_id ?? null,
      companyName: (c.company as unknown as { name: string } | null)?.name ?? null,
    }));
    companyOptions = (companiesResp.data ?? []).map((c) => ({ id: c.id, name: c.name }));
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <ContactSummary conversation={conversation} />

      {!conversation.contact_id && (
        <div className="px-4 pb-4">
          <p className="mb-2 text-xs text-muted-foreground">
            Esse contato ainda não tá no seu CRM.
          </p>
          <PromoteButton
            orgSlug={orgSlug}
            conversationId={conversation.id}
            externalThreadId={conversation.external_thread_id}
            contactOptions={contactOptions}
            companyOptions={companyOptions}
          />
        </div>
      )}

      <div className="border-t border-border/60 px-4 pt-3 pb-1">
        <TagsSection
          orgId={conversation.organization_id}
          orgSlug={orgSlug}
          entityType="conversation"
          entityId={conversation.id}
          conversationContactId={conversation.contact_id}
          conversationContactName={conversation.contact?.name ?? null}
        />
      </div>

      {conversation.contact_id && (
        <div className="border-t border-border/60 pt-3">
          <RelatedDeals orgSlug={orgSlug} contactId={conversation.contact_id} />
        </div>
      )}

      {conversation.contact_id && (
        <div className="border-t border-border/60 pt-3">
          <RelatedTasks orgSlug={orgSlug} contactId={conversation.contact_id} />
        </div>
      )}
    </div>
  );
}
