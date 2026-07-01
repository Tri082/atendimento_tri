import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="font-semibold text-2xl">Página não encontrada</h2>
      <p className="text-muted-foreground text-sm">
        O endereço que você procurou não existe (ou você não tem acesso).
      </p>
      <Button render={<Link href="/" />} nativeButton={false}>
        Voltar ao início
      </Button>
    </div>
  );
}
