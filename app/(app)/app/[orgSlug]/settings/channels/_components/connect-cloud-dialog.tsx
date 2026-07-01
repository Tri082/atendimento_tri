"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, CheckCircle2Icon, CheckIcon, CopyIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  type ConnectChannelInput,
  connectChannelInputSchema,
} from "@/lib/messaging/adapters/whatsapp-cloud/action-schemas";
import {
  connectWhatsappChannelAction,
  verifyWhatsappChannelAction,
} from "@/lib/messaging/adapters/whatsapp-cloud/actions";
import { WizardStepper } from "./wizard-stepper";

const STEPS = [
  { id: 1, label: "Pré-requisitos" },
  { id: 2, label: "Credenciais" },
  { id: 3, label: "Webhook" },
  { id: 4, label: "Verificar" },
];

const PREREQ_ITEMS = [
  "Conta Business Meta verificada (business.facebook.com)",
  "Número de telefone empresarial verificado no WhatsApp",
  "App Meta no developers.facebook.com com produto 'WhatsApp Business'",
  "System User Token de longa duração (mais estável que User Token)",
];

type Step = 1 | 2 | 3 | 4;
type VerifyState = "idle" | "verifying" | "success" | "error";

export function ConnectCloudDialog({
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
  const [channelId, setChannelId] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [templatesCount, setTemplatesCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ConnectChannelInput>({
    resolver: zodResolver(connectChannelInputSchema),
    defaultValues: {
      orgSlug,
      name: "",
      config: {
        phoneNumberId: "",
        wabaId: "",
        accessToken: "",
        appSecret: "",
      },
    },
  });

  function reset() {
    setStep(1);
    setChannelId(null);
    setVerifyToken(null);
    setVerifyState("idle");
    setVerifyError(null);
    setTemplatesCount(null);
    setSubmitting(false);
    form.reset({
      orgSlug,
      name: "",
      config: {
        phoneNumberId: "",
        wabaId: "",
        accessToken: "",
        appSecret: "",
      },
    });
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setTimeout(reset, 200);
      if (channelId) router.refresh();
    }
  }

  async function onSubmitCredentials(values: ConnectChannelInput) {
    setSubmitting(true);
    const r = await connectWhatsappChannelAction(values);
    setSubmitting(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    if (!r.data) return;
    setChannelId(r.data.channelId);
    setVerifyToken(r.data.verifyToken);
    setStep(3);
  }

  async function verify() {
    if (!channelId) return;
    setVerifyState("verifying");
    setVerifyError(null);
    const r = await verifyWhatsappChannelAction({ orgSlug, channelId });
    if (!r.ok) {
      setVerifyError(r.error);
      setVerifyState("error");
      return;
    }
    setTemplatesCount(r.data?.templatesSynced ?? 0);
    setVerifyState("success");
    toast.success("Canal conectado!");
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://seu-dominio.com").replace(/\/$/, "");
  const webhookUrl = `${appUrl}/api/webhooks/messaging/whatsapp_cloud`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp Cloud</DialogTitle>
          <DialogDescription>Provider oficial Meta. Sem risco de ban.</DialogDescription>
        </DialogHeader>

        <WizardStepper steps={STEPS} current={step} />

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Antes de continuar, confirme que você tem tudo isso no Meta:
            </p>

            <Card>
              <CardContent className="p-4">
                <ul className="space-y-2.5">
                  {PREREQ_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Não tem alguma dessas?{" "}
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ver guia oficial da Meta
              </a>
              .
            </p>
          </div>
        )}

        {step === 2 && (
          <Form {...form}>
            <form
              id="cloud-credentials-form"
              onSubmit={form.handleSubmit(onSubmitCredentials)}
              className="space-y-3"
            >
              <TextField
                control={form.control}
                name="name"
                label="Nome do canal"
                description="Ex: WhatsApp Vendas, WhatsApp Suporte"
              />
              <TextField
                control={form.control}
                name="config.phoneNumberId"
                label="Phone Number ID"
                description="15-16 dígitos do número WhatsApp Business"
              />
              <TextField
                control={form.control}
                name="config.wabaId"
                label="WhatsApp Business Account ID"
                description="ID da WABA (encontre em business.facebook.com)"
              />
              <TextField
                control={form.control}
                name="config.accessToken"
                label="Access Token"
                description="System User Token de longa duração"
                inputProps={{ type: "password" }}
              />
              <TextField
                control={form.control}
                name="config.appSecret"
                label="App Secret"
                description="App Settings > Basic no developers.facebook.com"
                inputProps={{ type: "password" }}
              />
            </form>
          </Form>
        )}

        {step === 3 && verifyToken && (
          <div className="space-y-4">
            <p className="text-sm">
              Vá em{" "}
              <strong>
                developers.facebook.com → seu app → WhatsApp → Configuration → Webhooks
              </strong>{" "}
              e configure:
            </p>

            <CopyBox label="Callback URL" value={webhookUrl} />
            <CopyBox label="Verify Token" value={verifyToken} />

            <Card className="bg-muted/30">
              <CardContent className="p-3 text-sm">
                <p className="font-medium">Depois disso:</p>
                <ol className="ml-4 mt-1.5 list-decimal space-y-0.5 text-xs text-muted-foreground">
                  <li>
                    Em &quot;Webhook fields&quot;, inscreva-se em{" "}
                    <code className="text-foreground">messages</code> (só esse)
                  </li>
                  <li>Salve as configurações na Meta</li>
                  <li>Volte aqui pra verificar a conexão</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 4 && verifyState !== "success" && (
          <div className="space-y-4">
            <p className="text-sm">
              Vamos testar se as credenciais e o webhook estão funcionando. Isso vai listar os
              templates do seu canal na Meta.
            </p>

            {verifyError && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="flex items-start gap-3 p-3">
                  <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Não foi possível conectar</p>
                    <p className="mt-1 text-muted-foreground">{verifyError}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Verifique se: (1) credenciais estão corretas, (2) webhook foi salvo na Meta,
                      (3) verify_token bate.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 4 && verifyState === "success" && channelId && (
          <div className="space-y-4 text-center">
            <CheckCircle2Icon className="mx-auto h-10 w-10 text-primary" />
            <h2 className="text-base font-semibold">Canal conectado!</h2>
            <p className="text-sm text-muted-foreground">
              {templatesCount} template
              {templatesCount === 1 ? "" : "s"} sincronizado
              {templatesCount === 1 ? "" : "s"} da Meta.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={() => handleOpenChange(false)} type="button">
                Cancelar
              </Button>
              <Button onClick={() => setStep(2)} type="button">
                Tenho tudo, continuar
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                type="button"
                disabled={submitting}
              >
                Voltar
              </Button>
              <Button type="submit" form="cloud-credentials-form" disabled={submitting}>
                {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Salvar e continuar
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="ghost" onClick={() => setStep(2)} type="button">
                Voltar
              </Button>
              <Button onClick={() => setStep(4)} type="button">
                Já configurei, continuar
              </Button>
            </>
          )}
          {step === 4 && verifyState !== "success" && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep(3)}
                type="button"
                disabled={verifyState === "verifying"}
              >
                Voltar
              </Button>
              <Button onClick={verify} disabled={verifyState === "verifying"} type="button">
                {verifyState === "verifying" && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Verificar conexão
              </Button>
            </>
          )}
          {step === 4 && verifyState === "success" && channelId && (
            <>
              <Button
                variant="outline"
                render={<Link href={`/app/${orgSlug}/inbox`} />}
                nativeButton={false}
              >
                Ir pra inbox
              </Button>
              <Button
                render={
                  <Link href={`/app/${orgSlug}/settings/channels/whatsapp-cloud/${channelId}`} />
                }
                nativeButton={false}
              >
                Ver detalhes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
          {value}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
