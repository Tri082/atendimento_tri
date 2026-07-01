"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateDealAction } from "@/lib/deals/actions";

type Props = { orgSlug: string; dealId: string; initial: string };

export function DealNotes({ orgSlug, dealId, initial }: Props) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = value !== initial;

  function handleSave() {
    startTransition(async () => {
      const r = await updateDealAction({ orgSlug, id: dealId, notes: value });
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
        placeholder="Anote o que precisar sobre esse deal..."
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
