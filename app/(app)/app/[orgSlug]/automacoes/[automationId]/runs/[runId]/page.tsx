import { notFound } from "next/navigation";
import { requireOrgRole } from "@/lib/auth/guards";
import { getRunWithSteps } from "@/lib/automations/queries";
import { StatusBadge } from "../../../_components/status-badge";
import { RetryButton } from "./_retry-button";
import { RunStatusExplainer } from "./_status-explainer";

export const metadata = { title: "Detalhe da run" };

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; automationId: string; runId: string }>;
}) {
  const { orgSlug, runId } = await params;
  // Sub-H H-8: detalhe de run é admin-only (mesmo escopo do retry)
  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });
  const data = await getRunWithSteps(org.id, runId);
  if (!data) notFound();
  const { run, steps } = data;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl">Run {runId.slice(0, 8)}</h1>
        <RetryButton orgSlug={orgSlug} runId={runId} />
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={run.status} />
        <span className="text-sm text-muted-foreground">
          {new Date(run.created_at).toLocaleString("pt-BR")}
        </span>
      </div>
      {[
        "skipped_conditions",
        "skipped_recursion",
        "skipped_queue_full",
        "skipped_payload_too_large",
        "failed",
      ].includes(run.status) && (
        <RunStatusExplainer status={run.status} error={run.error} />
      )}
      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          A run não chegou a executar nenhum step.
        </p>
      ) : (
        <ol className="space-y-2">
          {steps.map((s) => (
            <li key={s.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">
                  {s.step_index + 1}. {s.action_type}
                </span>
                <StatusBadge status={s.status} />
              </div>
              {s.error && (
                <p className="mt-1 text-xs text-destructive">{s.error}</p>
              )}
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Input / Output
                </summary>
                <p className="mt-1 text-muted-foreground">Input:</p>
                <pre className="overflow-x-auto rounded bg-muted p-2 mt-1">
                  {JSON.stringify(s.input, null, 2)}
                </pre>
                {s.output != null && (
                  <>
                    <p className="mt-2 text-muted-foreground">Output:</p>
                    <pre className="overflow-x-auto rounded bg-muted p-2 mt-1">
                      {JSON.stringify(s.output, null, 2)}
                    </pre>
                  </>
                )}
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
