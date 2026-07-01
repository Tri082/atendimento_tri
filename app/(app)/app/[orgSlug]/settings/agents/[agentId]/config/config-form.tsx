"use client";

import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateAgentAction } from "@/lib/agent/agents/actions";
import type { Agent } from "@/lib/agent/agents/queries";
import { SystemPromptPreview } from "./system-prompt-preview";

type Tone = "formal" | "casual" | "amigavel";
type Provider = "anthropic" | "openai";

// Ordem importa: primeiro item vira default ao trocar de provedor.
const MODELS_BY_PROVIDER: Record<Provider, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-5.4-mini", label: "GPT-5.4 mini (rápido, recomendado)" },
    { value: "gpt-5.5", label: "GPT-5.5 (qualidade máxima)" },
    { value: "gpt-5.4", label: "GPT-5.4 (qualidade)" },
    { value: "gpt-5.4-nano", label: "GPT-5.4 nano (ultra barato)" },
    { value: "gpt-5", label: "GPT-5 (anterior, ainda bom)" },
    { value: "gpt-4o-mini", label: "GPT-4o mini (legado, barato)" },
    { value: "gpt-4o", label: "GPT-4o (legado, qualidade)" },
  ],
  anthropic: [
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (rápido, barato)" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (qualidade)" },
    { value: "claude-opus-4-7", label: "Claude Opus 4.7 (qualidade máxima, 1M contexto)" },
  ],
};

export function ConfigForm({ orgSlug, agent }: { orgSlug: string; agent: Agent }) {
  const [agentName, setAgentName] = useState(agent.name);
  const [companyName, setCompanyName] = useState(agent.company_name ?? "");
  const [persona, setPersona] = useState(agent.persona ?? "");
  const [goal, setGoal] = useState(agent.goal ?? "");
  const [tone, setTone] = useState<Tone>(agent.tone);
  const [neverDo, setNeverDo] = useState(agent.never_do ?? "");
  const [tokenCap, setTokenCap] = useState(agent.daily_token_cap);
  const [provider, setProvider] = useState<Provider>(agent.llm_provider);
  const [model, setModel] = useState(agent.llm_model);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await updateAgentAction({
        orgSlug,
        agentId: agent.id,
        name: agentName,
        company_name: companyName || null,
        persona: persona || null,
        goal: goal || null,
        tone,
        never_do: neverDo || null,
        daily_token_cap: tokenCap,
        llm_provider: provider,
        llm_model: model,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Configuração salva");
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="font-medium">Identidade</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="agent_name">Nome do agente</Label>
            <Input id="agent_name" value={agentName} onChange={(e) => setAgentName(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name">Nome da empresa</Label>
            <Input id="company_name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} placeholder="Ex: Loja do Zé" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tom</Label>
          <div className="flex gap-4 text-sm">
            {(["formal", "casual", "amigavel"] as Tone[]).map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input type="radio" name="tone" value={t} checked={tone === t} onChange={() => setTone(t)} />
                <span className="capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium">Comportamento</h3>
        <div className="space-y-2">
          <Label htmlFor="persona">Persona (como ele se apresenta)</Label>
          <Textarea id="persona" value={persona} onChange={(e) => setPersona(e.target.value)} rows={3} maxLength={2000} placeholder="Ex: Você é um atendente da Loja do Zé, especializado em..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Objetivo principal</Label>
          <Textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} maxLength={2000} placeholder="Ex: Tirar dúvidas sobre produtos e agendar visita técnica." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="never_do">Coisas que ele NUNCA deve fazer</Label>
          <Textarea id="never_do" value={neverDo} onChange={(e) => setNeverDo(e.target.value)} rows={2} maxLength={2000} placeholder="Ex: Nunca prometa desconto sem confirmar com um humano." />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium">Modelo e limite</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="provider">Provedor</Label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => {
                const p = e.target.value as Provider;
                setProvider(p);
                setModel(MODELS_BY_PROVIDER[p][0]!.value);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="openai">OpenAI (recomendado)</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {MODELS_BY_PROVIDER[provider].map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tokenCap">Cota diária (tokens)</Label>
          <Input
            id="tokenCap"
            type="number"
            min={1000}
            max={10_000_000}
            value={tokenCap}
            onChange={(e) => setTokenCap(Number(e.target.value))}
          />
        </div>
      </section>

      <SystemPromptPreview settings={{ agent_name: agentName, company_name: companyName, persona, goal, tone, never_do: neverDo }} />

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
