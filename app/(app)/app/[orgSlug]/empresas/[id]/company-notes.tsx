"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateCompanyAction } from "@/lib/companies/actions";

type Props = { orgSlug: string; companyId: string; initial: string };

export function CompanyNotes({ orgSlug, companyId, initial }: Props) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = value !== initial;

  function handleSave() {
    startTransition(async () => {
      const r = await updateCompanyAction({ orgSlug, id: companyId, notes: value });
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
        placeholder="Anote o que precisar sobre essa empresa..."
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
