import { AlertTriangleIcon } from "lucide-react";
import type { PlaceholderHit } from "@/lib/automations/placeholders";

const FIELD_LABELS: Record<string, string> = {
  company_id: "ID da empresa",
  webhook_secret: "Segredo do webhook",
  url: "URL do webhook",
};

export function PreActivationBanner({
  hits,
  actionLabels,
}: {
  hits: PlaceholderHit[];
  actionLabels: string[];
}) {
  if (hits.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangleIcon className="h-5 w-5 mt-0.5 shrink-0 text-amber-500" />
        <div className="space-y-2">
          <p className="font-medium text-amber-200">
            Preencha esses campos antes de ativar a automação:
          </p>
          <ul className="list-disc list-inside text-amber-100/90 space-y-0.5">
            {hits.map((h) => (
              <li key={`${h.actionIndex}-${h.key}`}>
                <span className="font-medium">
                  {FIELD_LABELS[h.key] ?? h.key}
                </span>{" "}
                em{" "}
                <span className="font-medium">
                  Ação {h.actionIndex + 1}
                  {actionLabels[h.actionIndex]
                    ? ` (${actionLabels[h.actionIndex]})`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-amber-100/70">
            Clique na ação abaixo pra editar. Enquanto tiver placeholder, o
            botão "Ativa" não funciona.
          </p>
        </div>
      </div>
    </div>
  );
}
