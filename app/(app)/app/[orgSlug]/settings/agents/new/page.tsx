import { requireOrgRole } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewAgentForm } from "./new-agent-form";

export const metadata = { title: "Novo agente" };

type Props = { params: Promise<{ orgSlug: string }> };

export default async function NewAgentPage({ params }: Props) {
  const { orgSlug } = await params;
  await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1.5">
        <span className="label-mono">/ agentes / novo</span>
        <h1 className="font-semibold text-3xl tracking-tight">Criar agente</h1>
        <p className="text-muted-foreground text-sm">
          Defina o básico. Você refina persona e conhecimento depois na tela do agente.
        </p>
      </div>
      <Card>
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ novo agente</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <NewAgentForm orgSlug={orgSlug} />
        </CardContent>
      </Card>
    </div>
  );
}
