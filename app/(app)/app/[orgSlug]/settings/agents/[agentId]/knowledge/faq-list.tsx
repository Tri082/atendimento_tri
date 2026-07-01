"use client";

import { useState } from "react";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { deleteFaqItemAction } from "@/lib/agent/faq/actions";
import { FaqFormDialog } from "./faq-form-dialog";

interface Faq {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  orgSlug: string;
  agentId: string;
  items: Faq[];
}

export function FaqList({ orgSlug, agentId, items }: Props) {
  const [editing, setEditing] = useState<Faq | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const r = await deleteFaqItemAction({ orgSlug, agentId, faqId: deleting.id });
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("FAQ removida");
    setDeleting(null);
  }

  if (items.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Nenhuma FAQ ainda. Adicione perguntas e respostas pro agente aprender.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {items.map((f) => (
          <li key={f.id} className="flex items-start justify-between p-4">
            <div className="flex-1 pr-4">
              <p className="font-medium text-sm">{f.question}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.answer}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(f)}>
                <PencilIcon className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(f)}>
                <Trash2Icon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <FaqFormDialog
          orgSlug={orgSlug}
          agentId={agentId}
          open={true}
          onOpenChange={(open) => !open && setEditing(null)}
          initial={editing}
        />
      )}

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover FAQ?</DialogTitle>
            <DialogDescription>
              {deleting?.question}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Sim, remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
