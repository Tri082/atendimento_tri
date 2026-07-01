"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="font-semibold text-2xl">Algo deu errado</h2>
      <p className="text-muted-foreground text-sm">
        Tente novamente. Se o problema continuar, cole o erro pro Claude Code e descreva o que tava
        fazendo.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
