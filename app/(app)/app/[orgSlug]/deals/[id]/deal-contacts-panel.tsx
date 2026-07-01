"use client";

import { Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ContactOption } from "@/components/forms/contact-combobox";
import { Button } from "@/components/ui/button";
import { unlinkContactFromDealAction } from "@/lib/deals/actions";
import type { DealContact } from "@/lib/deals/queries";
import { LinkContactDialog } from "./link-contact-dialog";

type Props = {
  orgSlug: string;
  dealId: string;
  companyId: string | null;
  vinculados: DealContact[];
  allContacts: ContactOption[];
};

export function DealContactsPanel({ orgSlug, dealId, companyId, vinculados, allContacts }: Props) {
  const [pending, startTransition] = useTransition();

  function handleUnlink(contactId: string) {
    if (!confirm("Desvincular esse contato do deal?")) return;
    startTransition(async () => {
      const r = await unlinkContactFromDealAction({
        orgSlug,
        dealId,
        contactId,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Contato desvinculado");
    });
  }

  const linkedIds = vinculados.map((c) => c.id);

  return (
    <div className="space-y-3">
      {vinculados.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum contato vinculado a esse deal ainda.</p>
      ) : (
        <ul className="space-y-1.5">
          {vinculados.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={`/app/${orgSlug}/contatos/${c.id}`}
                  className="truncate font-medium text-sm hover:underline"
                >
                  {c.name}
                </Link>
                {c.title && <p className="text-muted-foreground text-xs">{c.title}</p>}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleUnlink(c.id)}
                disabled={pending}
                aria-label="Desvincular"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <LinkContactDialog
        orgSlug={orgSlug}
        dealId={dealId}
        companyId={companyId}
        allContacts={allContacts}
        alreadyLinkedIds={linkedIds}
      />
    </div>
  );
}
