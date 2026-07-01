import { InfoIcon } from "lucide-react";

type Props = {
  children: React.ReactNode;
};

/**
 * Banner discreto avisando o aluno que a página é só exemplo do template.
 * Aluno troca pelo CRUD/feature real dele depois.
 */
export function DemoBanner({ children }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="space-y-0.5">
        <p className="font-mono text-[10px] text-primary uppercase tracking-wider">
          / demo do template
        </p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
