import { recoverStaleAgents } from "@/lib/agent/recovery";
import { recoverStaleDocuments } from "@/lib/agent/rag/ingest";
import { AUTOMATION_LIMITS } from "@/lib/automations/limits";
import { recoverStaleAutomationSteps } from "@/lib/automations/recovery";
import { processNextRuns } from "@/lib/automations/worker";
import { recoverStaleMessages } from "@/lib/messaging/recovery";

const intervals: NodeJS.Timeout[] = [];

// Sub-H H-3: singleton flag pra evitar registrar intervals duas vezes
// (hot-reload em dev, multi-import em prod)
let jobsStarted = false;

// Sub-H H-2: re-entrancy guards pra evitar ticks empilhados quando
// uma execução demora mais que o intervalo do setInterval.
let automationWorkerRunning = false;
let automationRecoveryRunning = false;

/**
 * Inicia jobs de background (recovery crons + worker de automações).
 * Chamado uma vez por `instrumentation.ts` no boot do Next.js.
 * Set `DISABLE_BACKGROUND_JOBS=true` no env pra pular (útil em testes).
 */
export function startBackgroundJobs(): void {
  if (process.env.DISABLE_BACKGROUND_JOBS === "true") {
    console.log("[jobs] disabled via DISABLE_BACKGROUND_JOBS");
    return;
  }

  // Sub-H H-3: singleton — boot só registra intervals uma vez
  if (jobsStarted) {
    console.log("[jobs] já iniciado — skip");
    return;
  }
  jobsStarted = true;

  // Mensagens em 'sending' há > 60s → marca 'failed'
  intervals.push(
    setInterval(() => {
      recoverStaleMessages().catch((err) =>
        console.error("[jobs/messaging]", err),
      );
    }, 60_000),
  );

  // Documentos em 'processing' há > 5min → marca 'failed'
  intervals.push(
    setInterval(() => {
      recoverStaleDocuments().catch((err) =>
        console.error("[jobs/docs]", err),
      );
    }, 30_000),
  );

  // Conversas com agent_status='thinking' > 5min → reset 'idle' + task pro humano
  intervals.push(
    setInterval(() => {
      recoverStaleAgents().catch((err) =>
        console.error("[jobs/agents]", err),
      );
    }, 30_000),
  );

  // Sub-H — worker de automações: pega runs pending e executa
  // Sub-H H-2: re-entrancy guard — se ainda rodando, skipa esse tick
  intervals.push(
    setInterval(async () => {
      if (automationWorkerRunning) return;
      automationWorkerRunning = true;
      try {
        await processNextRuns();
      } catch (err) {
        console.error("[jobs/automations]", err);
      } finally {
        automationWorkerRunning = false;
      }
    }, AUTOMATION_LIMITS.WORKER_INTERVAL_MS),
  );

  // Sub-H — recovery de steps presos em 'running' > 90s (H-7)
  intervals.push(
    setInterval(async () => {
      if (automationRecoveryRunning) return;
      automationRecoveryRunning = true;
      try {
        await recoverStaleAutomationSteps();
      } catch (err) {
        console.error("[jobs/automations-recovery]", err);
      } finally {
        automationRecoveryRunning = false;
      }
    }, AUTOMATION_LIMITS.RECOVERY_INTERVAL_MS),
  );

  console.log(
    "[jobs] started 5 background intervals (3 recoveries + automations worker + recovery)",
  );

  // Sub-H H-3: SIGTERM com guard de duplicate registration (em vez de gating por NODE_ENV)
  if (process.listenerCount("SIGTERM") === 0) {
    process.on("SIGTERM", () => {
      console.log("[jobs] SIGTERM — clearing intervals");
      intervals.forEach(clearInterval);
    });
  }
}
