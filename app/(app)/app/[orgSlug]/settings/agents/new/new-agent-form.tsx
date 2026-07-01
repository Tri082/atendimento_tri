"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgentAction } from "@/lib/agent/agents/actions";

type Tone = "formal" | "casual" | "amigavel";

export function NewAgentForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [tone, setTone] = useState<Tone>("casual");
  const [tokenCap, setTokenCap] = useState(10_000_000);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome ao agente.");
      return;
    }
    start(async () => {
      const r = await createAgentAction({ orgSlug, name: name.trim(), tone, daily_token_cap: tokenCap });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Agente criado!");
      router.push(`/app/${orgSlug}/settings/agents/${r.data?.agentId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do agente</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Vendas, Suporte..."
          maxLength={80}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Tom de voz</Label>
        <div className="flex gap-4 text-sm">
          {(["formal", "casual", "amigavel"] as Tone[]).map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input
                type="radio"
                name="tone"
                value={t}
                checked={tone === t}
                onChange={() => setTone(t)}
              />
              <span className="capitalize">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cap">Cota diária de tokens</Label>
        <Input
          id="cap"
          type="number"
          min={1000}
          max={10_000_000}
          step={1000}
          value={tokenCap}
          onChange={(e) => setTokenCap(Number(e.target.value))}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando…" : "Criar agente"}
        </Button>
      </div>
    </form>
  );
}
