"use client";

import { SendIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { testSendEvolutionAction } from "@/lib/messaging/adapters/whatsapp-evolution/actions";

export function TestSendForm({ orgSlug, channelId }: { orgSlug: string; channelId: string }) {
  const [pending, start] = useTransition();
  const [to, setTo] = useState("");
  const [body, setBody] = useState("Mensagem de teste do template.");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await testSendEvolutionAction({
        orgSlug,
        channelId,
        to: to.trim(),
        body: body.trim(),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Enviado! ID externo: ${r.data?.externalId.slice(0, 12)}…`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="to">Número destino (com DDI)</Label>
        <Input
          id="to"
          type="text"
          placeholder="+5511999990000"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Mensagem</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          required
          maxLength={4096}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <SendIcon className="mr-2 h-4 w-4" />
          {pending ? "Enviando…" : "Enviar teste"}
        </Button>
      </div>
    </form>
  );
}
