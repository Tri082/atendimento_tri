import Link from "next/link";
import { requireOrgRole } from "@/lib/auth/guards";
import { listRecentRuns } from "@/lib/automations/queries";
import { StatusBadge } from "../../_components/status-badge";

export const metadata = { title: "Histórico de execuções" };

export default async function RunsListPage({
  params,
}: {
  params: Promise<{ orgSlug: string; automationId: string }>;
}) {
  const { orgSlug, automationId } = await params;
  // Sub-H H-8: histórico de runs é admin-only (mesmo escopo da automação)
  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });
  const runs = await listRecentRuns(org.id, automationId);

  return (
    <div className="space-y-4">
      <h1 className="font-semibold text-2xl">Histórico de execuções</h1>
      {runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma execução ainda.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {runs.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/${orgSlug}/automacoes/${automationId}/runs/${r.id}`}
                className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
              >
                <div>
                  <div className="text-xs font-mono">
                    {r.trigger_event_id.slice(0, 48)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </div>
                  {r.error && (
                    <div className="text-xs text-destructive mt-0.5 line-clamp-1">
                      {r.error}
                    </div>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
