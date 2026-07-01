export const AUTOMATION_LIMITS = {
  /** Máximo de actions por automation */
  MAX_ACTIONS_PER_AUTOMATION: 20,
  /** Máximo de conditions por automation */
  MAX_CONDITIONS_PER_AUTOMATION: 10,
  /** Máximo de runs em status 'pending' por org (proteção fila) */
  MAX_PENDING_RUNS_PER_ORG: 100,
  /** Recursion depth máxima — automação que dispara automação */
  MAX_RECURSION_DEPTH: 5,
  /** Timeout por step (Promise.race no execute) */
  STEP_TIMEOUT_MS: 30_000,
  /** Hard cutoff por step via recovery (Sub-H H-7: 3x gap em vez de 2x pra evitar race com engine) */
  STEP_RECOVERY_CUTOFF_MS: 90_000,
  /** Tamanho máximo do payload do trigger em bytes */
  MAX_TRIGGER_PAYLOAD_BYTES: 64 * 1024,
  /** Quantos runs pending o worker pega por ciclo */
  WORKER_BATCH_SIZE: 10,
  /** Intervalo do worker em ms */
  WORKER_INTERVAL_MS: 5_000,
  /** Intervalo do recovery em ms */
  RECOVERY_INTERVAL_MS: 30_000,
} as const;
