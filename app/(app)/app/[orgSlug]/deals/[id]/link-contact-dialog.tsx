"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ContactCombobox, type ContactOption } from "@/components/forms/contact-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { linkContactToDealAction } from "@/lib/deals/actions";

type Props = {
  orgSlug: string;
  dealId: string;
  companyId: string | null;
  allContacts: ContactOption[];
  alreadyLinkedIds: string[];
};

export function LinkContactDialog({
  orgSlug,
  dealId,
  companyId,
  allContacts,
  alreadyLinkedIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLink() {
    if (!selected) {
      toast.error("Escolha um contato");
      return;
    }
    startTransition(async () => {
      const r = await linkContactToDealAction({
        orgSlug,
        dealId,
        contactId: selected,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Contato vinculado");
      setSelected(null);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5">
            + Vincular contato
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular contato a esse deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <ContactCombobox
            options={allContacts}
            value={selected}
            onChange={setSelected}
            prioritizeCompanyId={companyId}
            excludeIds={alreadyLinkedIds}
            placeholder="Selecionar contato..."
          />
          <Button onClick={handleLink} disabled={pending} className="w-full">
            {pending ? "Vinculando..." : "Vincular"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
