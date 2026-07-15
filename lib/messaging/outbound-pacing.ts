/**
 * Fila de saída com espaçamento humano, por canal. Evita rajadas de
 * mensagens (várias respostas do roteiro/agente disparando quase juntas),
 * que é um dos padrões que sistemas antifraude de WhatsApp usam pra
 * identificar automação. Estado em memória, por processo — mesmo padrão do
 * semáforo do agente (`lib/agent/CLAUDE.md`); se o app virar multi-réplica,
 * isso precisa virar um lock/fila distribuída.
 */

const MIN_INTERVAL_MS = Number(process.env.WHATSAPP_SEND_MIN_INTERVAL_MS ?? 1200);
const JITTER_MIN_MS = Number(process.env.WHATSAPP_SEND_JITTER_MIN_MS ?? 800);
const JITTER_MAX_MS = Number(process.env.WHATSAPP_SEND_JITTER_MAX_MS ?? 2000);

const channelQueues = new Map<string, Promise<number>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve quando é a vez do canal `channelId` mandar a próxima mensagem.
 * Serializa por canal (fila FIFO) e garante um intervalo mínimo + jitter
 * aleatório desde o último envio — chame logo antes de despachar pro
 * adapter, depois de já ter decidido que a mensagem vai ser enviada.
 */
export function acquireOutboundSlot(channelId: string): Promise<void> {
  const previous = channelQueues.get(channelId) ?? Promise.resolve(0);

  const next = previous.then(async (lastSentAt) => {
    const jitter = JITTER_MIN_MS + Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS);
    const elapsedSinceLast = Date.now() - lastSentAt;
    const wait = Math.max(jitter, MIN_INTERVAL_MS - elapsedSinceLast, 0);
    if (wait > 0) await sleep(wait);
    return Date.now();
  });

  channelQueues.set(channelId, next);
  return next.then(() => undefined);
}
