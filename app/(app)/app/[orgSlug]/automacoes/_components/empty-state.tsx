import { ZapIcon } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <ZapIcon className="h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">
        Nenhuma automação ainda. Escolha um modelo acima ou crie do zero.
      </p>
    </div>
  );
}
