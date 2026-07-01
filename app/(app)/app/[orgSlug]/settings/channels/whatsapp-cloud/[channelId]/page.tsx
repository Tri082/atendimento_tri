import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getApprovedTemplatesByChannel } from "@/lib/messaging/templates/queries";
import { SyncButton } from "./sync-button";
import { DisconnectButton } from "./disconnect-button";
import { TestSendForm } from "./test-send";
import { AgentSelector } from "../../_components/agent-selector";

export default async function ChannelDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; channelId: string }>;
}) {
  const { orgSlug, channelId } = await params;
  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });

  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("id, type, name, status, last_error, created_at, agent_id")
    .eq("id", channelId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!channel) notFound();

  const [templates, { data: agents }] = await Promise.all([
    getApprovedTemplatesByChannel(channelId),
    supabase
      .from("agents")
      .select("id, name, is_active")
      .eq("organization_id", org.id)
      .order("name"),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <span className="label-mono">/ canais / whatsapp / detalhe</span>
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-3xl tracking-tight">{channel.name}</h1>
          <Badge variant={channel.status === "connected" ? "default" : "secondary"}>
            {channel.status}
          </Badge>
        </div>
        {channel.last_error && (
          <p className="text-sm text-destructive">{channel.last_error}</p>
        )}
      </div>

      <Card>
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ agente IA</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <AgentSelector
            orgSlug={orgSlug}
            channelId={channel.id}
            currentAgentId={channel.agent_id ?? null}
            agents={agents ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center justify-end border-b border-border/60 p-3">
            <SyncButton orgSlug={orgSlug} channelId={channelId} />
          </div>
          {templates.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhum template aprovado ainda. Clique em &quot;Sincronizar&quot; pra puxar da Meta.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {templates.map((t) => (
                <li key={t.id} className="p-4">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.language} · {t.category} · {t.param_count} param{t.param_count === 1 ? "" : "s"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <TestSendForm orgSlug={orgSlug} channelId={channelId} templates={templates} />

      <div className="flex justify-end pt-4">
        <DisconnectButton orgSlug={orgSlug} channelId={channelId} />
      </div>
    </div>
  );
}
