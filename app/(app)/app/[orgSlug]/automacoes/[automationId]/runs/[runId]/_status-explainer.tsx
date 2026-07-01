import { AlertCircleIcon, InfoIcon } from "lucide-react";

interface ExplainerContent {
  icon: "alert" | "info";
  title: string;
  what: string;
  why: string;
  howToFix: string;
}

const EXPLAINERS: Record<string, ExplainerContent> = {
  skipped_conditions: {
    icon: "info",
    title: "Condições não bateram",
    what: "O evento até disparou, mas alguma condição do bloco 'Se' não passou — então as ações não rodaram.",
    why: "Isso é normal. Você definiu filtros que restringem quando a automação age.",
    howToFix: "Se queria que rodasse, revise as condições. O erro acima mostra qual condição bloqueou.",
  },
  skipped_recursion: {
    icon: "alert",
    title: "Recursão demais",
    what: "Uma automação disparou outra, que disparou outra... a cadeia passou de 5 níveis e foi cortada.",
    why: "Esse limite existe pra evitar loop infinito — uma automação rodando pra sempre travaria o sistema.",
    howToFix: "Reveja quais automações estão ativas no mesmo trigger. Você pode estar tendo duas que disparam uma à outra. Pause uma delas ou ajuste a lógica.",
  },
  skipped_queue_full: {
    icon: "alert",
    title: "Fila cheia",
    what: "Sua organização já tem 100 automações esperando rodar. O evento foi descartado pra não acumular.",
    why: "Esse limite protege o sistema de travar quando algo dispara muita execução de uma vez.",
    howToFix: "Pause automações que estão acumulando runs (veja o histórico de cada uma). Aguarde a fila esvaziar — o worker processa de 10 em 10 a cada 5 segundos.",
  },
  skipped_payload_too_large: {
    icon: "alert",
    title: "Evento muito grande",
    what: "Os dados do evento que disparou a automação passaram do tamanho máximo permitido (64 KB).",
    why: "Esse limite existe pra evitar inflar o banco com mídias gigantes (ex: foto em base64 numa mensagem).",
    howToFix: "Geralmente acontece quando uma mensagem inbound tem mídia muito grande. Não tem fix do lado da automação — a mensagem em si é o problema. Se for recorrente, revise se algum canal tá mandando arquivos grandes embutidos.",
  },
  failed: {
    icon: "alert",
    title: "A automação falhou",
    what: "Uma das ações deu erro durante a execução.",
    why: "Pode ser muita coisa: dados faltando, URL inválida, contato não encontrado, token expirado, etc.",
    howToFix: "Olha o erro do step que falhou (na timeline abaixo) — ele descreve o motivo. Se for uma ação com 'parar se falhar', a automação inteira foi marcada como falhou. Considere mudar pra 'segue se falhar' nas ações não-críticas.",
  },
};

export function RunStatusExplainer({
  status,
  error,
}: { status: string; error: string | null }) {
  const explainer = EXPLAINERS[status];
  if (!explainer) return null;
  const isInfo = explainer.icon === "info";
  const Icon = isInfo ? InfoIcon : AlertCircleIcon;
  return (
    <div
      className={`rounded-md border p-4 space-y-2 ${
        isInfo
          ? "border-blue-500/40 bg-blue-500/10"
          : "border-amber-500/40 bg-amber-500/10"
      }`}
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon className="h-5 w-5" />
        {explainer.title}
      </div>
      {error && (
        <div className="rounded bg-background/40 p-2 text-xs font-mono text-muted-foreground">
          {error}
        </div>
      )}
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">O que aconteceu:</span> {explainer.what}
        </div>
        <div>
          <span className="font-medium">Por que esse limite existe:</span> {explainer.why}
        </div>
        <div>
          <span className="font-medium">Como resolver:</span> {explainer.howToFix}
        </div>
      </div>
    </div>
  );
}
