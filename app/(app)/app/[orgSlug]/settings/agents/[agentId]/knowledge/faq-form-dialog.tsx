"use client";

import { useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createFaqItemAction, updateFaqItemAction } from "@/lib/agent/faq/actions";

interface Props {
  orgSlug: string;
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { id: string; question: string; answer: string } | null;
}

export function FaqFormDialog({ orgSlug, agentId, open, onOpenChange, initial }: Props) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = initial
        ? await updateFaqItemAction({ orgSlug, agentId, faqId: initial.id, question, answer })
        : await createFaqItemAction({ orgSlug, agentId, question, answer });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(initial ? "FAQ atualizada" : "FAQ criada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar FAQ" : "Nova FAQ"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="faq-q">Pergunta</Label>
            <Input id="faq-q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} placeholder="Ex: Vocês entregam pra todo o Brasil?" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-a">Resposta</Label>
            <Textarea id="faq-a" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} maxLength={5000} placeholder="Resposta clara e direta. O agente vai usar isso pra responder." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending || question.length === 0 || answer.length === 0}>
            {pending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
