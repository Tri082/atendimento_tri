"use client";

import { CheckCircle2Icon, Loader2Icon, ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectEvolutionChannelAction } from "@/lib/messaging/adapters/whatsapp-evolution/actions";
import { WizardStepper } from "./wizard-stepper";

const STEPS = [
  { id: 1, label: "Aviso" },
  { id: 2, label: "Credenciais" },
  { id: 3, label: "Pronto" },
];

type Step = 1 | 2 | 3;

type ConnectedChannel = {
  channelId: string;
  displayName: string;
};

export function ConnectEvolutionDialog({
  orgSlug,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [accepted, setAccepted] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, start] = useTransition();
  const [connected, setConnected] = useState<ConnectedChannel | null>(null);

  function reset() {
    setStep(1);
    setAccepted(false);
    setBaseUrl("");
    setApiKey("");
    setInstanceName("");
    setDisplayName("");
    setConnected(null);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      // Reset depois da animação de fechar pra não piscar conteúdo.
      setTimeout(reset, 200);
      // Atualiza a lista pra refletir canal recém conectado.
      if (connected) router.refresh();
    }
  }

  function onSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await connectEvolutionChannelAction({
        orgSlug,
        baseUrl: baseUrl.trim().replace(/\/$/, ""),
        apiKey: apiKey.trim(),
        instanceName: instanceName.trim(),
        displayName: displayName.trim(),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const id = r.data?.channelId;
      if (!id) {
        toast.error("Canal conectado, mas o ID não veio. Recarregue a página.");
        return;
      }
      toast.success("Canal conectado!");
      setConnected({ channelId: id, displayName: displayName.trim() });
      setStep(3);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp via Evolution</DialogTitle>
          <DialogDescription>
            Provider não-oficial. Conexão via API key + nome da instância.
          </DialogDescription>
        </DialogHeader>

        <WizardStepper steps={STEPS} current={step} />

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <ShieldAlertIcon className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Antes de conectar: leia com atenção
                </p>
                <p className="text-amber-900/80 dark:text-amber-100/80">
                  Você vai conectar seu WhatsApp via Evolution API, que usa WhatsApp Web por baixo
                  dos panos. É <strong>não oficial</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Riscos reais:</h3>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                <li>O Meta pode banir o número (temporário ou permanente)</li>
                <li>Sem suporte do Meta se algo der errado</li>
                <li>Mass-send ou conteúdo automatizado aumenta o risco</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recomendações:</h3>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                <li>Use um número secundário, NÃO o seu pessoal</li>
                <li>Não dispare mensagem em massa pra números aleatórios</li>
                <li>Personalize as conversas — pareça humano</li>
                <li>Se ban acontecer, você perde o número (Meta não reverte)</li>
              </ul>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              Entendi os riscos e quero seguir
            </label>
          </div>
        )}

        {step === 2 && (
          <form
            id="evolution-credentials-form"
            onSubmit={onSubmitCredentials}
            className="space-y-4"
          >
            <div className="space-y-1 rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
              <p className="font-medium text-foreground">Pré-requisitos</p>
              <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                <li>Evolution API rodando em um servidor</li>
                <li>Instância criada e QR escaneado (estado &quot;open&quot;)</li>
              </ul>
              <p className="text-muted-foreground">
                Docs:{" "}
                <a
                  href="https://doc.evolution-api.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  doc.evolution-api.com
                </a>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evo-baseUrl">URL do Evolution</Label>
              <Input
                id="evo-baseUrl"
                type="url"
                placeholder="https://evo.meudominio.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Sem barra no final.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evo-apiKey">API key global</Label>
              <Input
                id="evo-apiKey"
                type="password"
                placeholder="••••••••••••••••"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                No <code>.env</code> do Evolution, variável <code>AUTHENTICATION_API_KEY</code>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evo-instance">Nome da instância</Label>
              <Input
                id="evo-instance"
                type="text"
                placeholder="minha-empresa"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                required
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">O nome exato como criou no Evolution.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evo-display">Nome interno (como aparece aqui)</Label>
              <Input
                id="evo-display"
                type="text"
                placeholder="WhatsApp Comercial"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
          </form>
        )}

        {step === 3 && connected && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <CheckCircle2Icon className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Canal conectado!</p>
                <p className="text-muted-foreground">{connected.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  Webhook configurado automaticamente no Evolution.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Próximos passos:</p>
              <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                <li>Mande uma mensagem pro número conectado pra testar</li>
                <li>Configure um agente IA pra responder (opcional)</li>
                <li>Acompanhe as conversas pela inbox</li>
              </ol>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={() => handleOpenChange(false)} type="button">
                Cancelar
              </Button>
              <Button onClick={() => setStep(2)} disabled={!accepted} type="button">
                Continuar
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} type="button" disabled={pending}>
                Voltar
              </Button>
              <Button type="submit" form="evolution-credentials-form" disabled={pending}>
                {pending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Verificar e conectar
              </Button>
            </>
          )}
          {step === 3 && connected && (
            <>
              <Button
                variant="outline"
                render={<Link href={`/app/${orgSlug}/settings/agents`} />}
                nativeButton={false}
              >
                Configurar agente IA
              </Button>
              <Button
                variant="outline"
                render={<Link href={`/app/${orgSlug}/inbox`} />}
                nativeButton={false}
              >
                Abrir inbox
              </Button>
              <Button
                render={
                  <Link
                    href={`/app/${orgSlug}/settings/channels/whatsapp-evolution/${connected.channelId}`}
                  />
                }
                nativeButton={false}
              >
                Ver detalhe
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
