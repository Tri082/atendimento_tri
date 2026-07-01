"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqFormDialog } from "./faq-form-dialog";

export function NewFaqButton({ orgSlug, agentId }: { orgSlug: string; agentId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="mr-1 h-3.5 w-3.5" />
        Nova pergunta
      </Button>
      <FaqFormDialog orgSlug={orgSlug} agentId={agentId} open={open} onOpenChange={setOpen} />
    </>
  );
}
