import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AgentSelector } from "../../_components/agent-selector";
import { DisconnectButton } from "./disconnect-button";
import { ReverifyButton } from "./reverify-button";
import { TestSendForm } from "./test-send-form";

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
    .select("id, type, name, status, last_error, created_at, config, agent_id")
    .eq("id", channelId)
    .eq("organization_id", org.id)
    .eq("type", "whatsapp_evolution")
    .maybeSingle();

  if (!channel) notFound();

  const [{ data: agents }] = await Promise.all([
    supabase
      .from("agents")
      .select("id, name, is_active")
      .eq("organization_id", org.id)
      .order("name"),
  ]);

  const cfg = channel.config as { connectedNumber?: string | null; instanceName?: string };

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <span className="label-mono">/ canais / whatsapp evolution / detalhe</span>
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
          <CardTitle className="label-mono text-[10px]">/ status da instância</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          <p className="text-sm">
            <strong>Instância:</strong> {cfg.instanceName ?? "—"}
          </p>
          <p className="text-sm">
            <strong>Número conectado:</strong> {cfg.connectedNumber ?? "—"}
          </p>
          <ReverifyButton orgSlug={orgSlug} channelId={channel.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ testar envio</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <TestSendForm orgSlug={orgSlug} channelId={channel.id} />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <DisconnectButton orgSlug={orgSlug} channelId={channel.id} />
      </div>
    </div>
  );
}
