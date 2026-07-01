import Link from "next/link";
import { MessageCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ConnectWhatsappDropdown } from "./_components/connect-whatsapp-dropdown";

const STATUS_LABEL: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  connected: { label: "Conectado", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  error: { label: "Erro", variant: "destructive" },
  disconnected: { label: "Desconectado", variant: "secondary" },
};

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });

  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("id, type, name, status, last_error, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <span className="label-mono">/ canais</span>
        <h1 className="font-semibold text-3xl tracking-tight">Canais</h1>
        <p className="text-muted-foreground text-sm">
          Conecte WhatsApp, Telegram e outros canais pra falar com seus contatos
          direto daqui.
        </p>
      </div>

      <div className="flex justify-end">
        <ConnectWhatsappDropdown orgSlug={orgSlug} />
      </div>

      <Card>
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">
            / canais conectados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!channels || channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircleIcon className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Nenhum canal conectado ainda.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {channels.map((c) => {
                const status = STATUS_LABEL[c.status] ?? {
                  label: c.status,
                  variant: "secondary" as const,
                };
                const detailHref =
                  c.type === "whatsapp_cloud"
                    ? `/app/${orgSlug}/settings/channels/whatsapp-cloud/${c.id}`
                    : c.type === "whatsapp_evolution"
                      ? `/app/${orgSlug}/settings/channels/whatsapp-evolution/${c.id}`
                      : "#";
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.type}
                      </div>
                      {c.last_error && (
                        <div className="mt-1 text-xs text-destructive">
                          {c.last_error}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={detailHref} />}
                        nativeButton={false}
                      >
                        Ver
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
