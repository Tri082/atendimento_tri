"use client";
import { useEffect, useState, useTransition } from "react";
import { runAutomationDryRunAction } from "@/lib/automations/actions.server";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "../../_components/status-badge";

interface Step {
  id: string;
  step_index: number;
  action_type: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
}

export function DryRunPanel({
  orgSlug,
  automationId,
  onClose,
}: {
  orgSlug: string;
  automationId: string;
  onClose: () => void;
}) {
  const [runId, setRunId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [runStatus, setRunStatus] = useState<string>("pending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  useEffect(() => {
    if (!runId) return;
    const supabase = createClient();
    const ch = supabase
      .channel(`dry-run-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "automation_run_steps",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          setSteps((cur) => {
            const next = [...cur];
            const incoming = payload.new as Step;
            const idx = next.findIndex((s) => s.id === incoming.id);
            if (idx === -1) next.push(incoming);
            else next[idx] = incoming;
            next.sort((a, b) => a.step_index - b.step_index);
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "automation_runs",
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as { status: string; error: string | null };
          setRunStatus(row.status);
          if (row.error) setErrorMsg(row.error);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [runId]);

  const run = () =>
    start(async () => {
      setSteps([]);
      setRunStatus("pending");
      setErrorMsg(null);
      const r = await runAutomationDryRunAction({
        orgSlug,
        id: automationId,
      });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      if (r.data) setRunId(r.data.runId);
    });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-lg">
            Testar automação (simulação)
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            A simulação roda a automação com dados de exemplo, sem efeito
            colateral real.
          </p>
          <Button onClick={run} disabled={isPending}>
            Rodar simulação
          </Button>
          {runId && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Status da run:</span>
                <StatusBadge status={runStatus} />
              </div>
              {errorMsg && (
                <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {errorMsg}
                </div>
              )}
              <ol className="space-y-2">
                {steps.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">
                        {s.step_index + 1}. {s.action_type}
                      </span>
                      <StatusBadge status={s.status} />
                    </div>
                    {s.error && (
                      <p className="mt-1 text-xs text-destructive">
                        {s.error}
                      </p>
                    )}
                    {s.output != null && (
                      <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(s.output, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
