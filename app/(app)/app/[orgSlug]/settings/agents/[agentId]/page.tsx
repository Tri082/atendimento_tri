import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireOrgRole } from "@/lib/auth/guards";
import { getAgent } from "@/lib/agent/agents/queries";
import { getUsageToday } from "@/lib/agent/usage";
import { getFaqItems } from "@/lib/agent/faq/queries";
import { getDocuments } from "@/lib/agent/documents/queries";
import { createClient } from "@/lib/supabase/server";
import { AgentTabs } from "./agent-tabs";
import { ConfigForm } from "./config/config-form";
import { UsageSummary } from "./config/usage-summary";
import { ChannelsSection } from "./config/channels-section";
import { DeleteAgentDialog } from "./config/delete-agent-dialog";
import { FaqList } from "./knowledge/faq-list";
import { NewFaqButton } from "./knowledge/new-faq-button";
import { DocumentList } from "./knowledge/document-list";
import { DocumentUploader } from "./knowledge/document-uploader";
import { RunsTable } from "./runs/runs-table";

type Tab = "config" | "knowledge" | "runs";

type Props = {
  params: Promise<{ orgSlug: string; agentId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export const metadata = { title: "Agente" };

export default async function AgentDetailPage({ params, searchParams }: Props) {
  const { orgSlug, agentId } = await params;
  const { tab } = await searchParams;
  const activeTab: Tab = tab === "knowledge" || tab === "runs" ? tab : "config";

  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });
  const agent = await getAgent(org.id, agentId);
  if (!agent) notFound();

  return (
    <div className="space-y-8">
      <Button
        render={<Link href={`/app/${orgSlug}/settings/agents`} />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Voltar pra lista
      </Button>

      <div className="space-y-1.5">
        <span className="label-mono">/ agente</span>
        <h1 className="font-semibold text-3xl tracking-tight">{agent.name}</h1>
        <p className="text-muted-foreground text-sm">
          {agent.is_active ? "Ativo" : "Pausado"} · {agent.llm_provider} / {agent.llm_model}
        </p>
      </div>

      <AgentTabs orgSlug={orgSlug} agentId={agentId} active={activeTab} />

      {activeTab === "config" && <ConfigTabContent orgSlug={orgSlug} orgId={org.id} agent={agent} />}
      {activeTab === "knowledge" && <KnowledgeTabContent orgSlug={orgSlug} agentId={agentId} />}
      {activeTab === "runs" && <RunsTabContent orgId={org.id} agentId={agentId} />}
    </div>
  );
}

async function ConfigTabContent({
  orgSlug,
  orgId,
  agent,
}: {
  orgSlug: string;
  orgId: string;
  agent: NonNullable<Awaited<ReturnType<typeof getAgent>>>;
}) {
  const supabase = await createClient();
  const [usage, { data: channels }] = await Promise.all([
    getUsageToday(agent.id),
    supabase
      .from("channels")
      .select("id, name, type, agent_id")
      .eq("organization_id", orgId)
      .order("name"),
  ]);

  return (
    <div className="space-y-8">
      <UsageSummary usage={usage} cap={agent.daily_token_cap} />
      <ConfigForm orgSlug={orgSlug} agent={agent} />
      <ChannelsSection orgSlug={orgSlug} agentId={agent.id} channels={channels ?? []} />
      <DeleteAgentDialog orgSlug={orgSlug} agentId={agent.id} agentName={agent.name} />
    </div>
  );
}

async function KnowledgeTabContent({ orgSlug, agentId }: { orgSlug: string; agentId: string }) {
  const [faqs, docs] = await Promise.all([getFaqItems(agentId), getDocuments(agentId)]);
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">FAQs</h2>
          <NewFaqButton orgSlug={orgSlug} agentId={agentId} />
        </div>
        <FaqList orgSlug={orgSlug} agentId={agentId} items={faqs} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Documentos (PDF)</h2>
        </div>
        <DocumentUploader orgSlug={orgSlug} agentId={agentId} />
        <DocumentList orgSlug={orgSlug} agentId={agentId} documents={docs} />
      </div>
    </div>
  );
}

async function RunsTabContent({ orgId, agentId }: { orgId: string; agentId: string }) {
  const supabase = await createClient();
  const { data: runs } = await supabase
    .from("agent_runs")
    .select("id, conversation_id, status, prompt_tokens, completion_tokens, tools_called, started_at, finished_at")
    .eq("organization_id", orgId)
    .eq("agent_id", agentId)
    .order("started_at", { ascending: false })
    .limit(100);

  return <RunsTable runs={runs ?? []} />;
}
