"use client";

import { useState } from "react";
import { LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContactOption } from "@/components/forms/contact-combobox";
import type { CompanyOption } from "@/components/forms/company-combobox";
import { PromoteToContactDialog } from "./promote-to-contact-dialog";

interface Props {
  orgSlug: string;
  conversationId: string;
  externalThreadId: string;
  contactOptions: ContactOption[];
  companyOptions: CompanyOption[];
}

export function PromoteButton({
  orgSlug,
  conversationId,
  externalThreadId,
  contactOptions,
  companyOptions,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="w-full">
        <LinkIcon className="mr-2 h-4 w-4" />
        Promover pra contato
      </Button>
      <PromoteToContactDialog
        orgSlug={orgSlug}
        conversationId={conversationId}
        externalThreadId={externalThreadId}
        contactOptions={contactOptions}
        companyOptions={companyOptions}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
