"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateContactAction } from "@/lib/contacts/actions";

type Props = { orgSlug: string; contactId: string; initial: string };

export function ContactNotes({ orgSlug, contactId, initial }: Props) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = value !== initial;

  function handleSave() {
    startTransition(async () => {
      const r = await updateContactAction({ orgSlug, id: contactId, notes: value });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Anotações salvas");
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        placeholder="Anote o que precisar sobre esse contato..."
        className="resize-y"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={pending || !dirty}>
          {pending ? "Salvando..." : "Salvar anotações"}
        </Button>
      </div>
    </div>
  );
}
