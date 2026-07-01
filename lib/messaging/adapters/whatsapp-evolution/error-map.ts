function extractMessage(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === "string") return body;
  if (typeof body === "object" && body !== null) {
    const obj = body as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (obj.error && typeof obj.error === "object") {
      const err = obj.error as Record<string, unknown>;
      if (typeof err.message === "string") return err.message;
    }
  }
  return null;
}

export function mapEvolutionError(status: number, body: unknown): string {
  if (status === 401) return "API key inválida. Reconecte o canal.";
  if (status === 404) return "Instância não encontrada no Evolution. Reconecte ou recrie a instância.";
  if (status === 400) {
    const msg = extractMessage(body);
    if (msg) {
      const lower = msg.toLowerCase();
      if (lower.includes("not exist") || lower.includes("does not")) return "Número não tem WhatsApp.";
      if (lower.includes("connection") || lower.includes("disconnected")) {
        return "Instância está desconectada. Escaneie o QR no Evolution.";
      }
      return `Erro do Evolution: ${msg}`;
    }
    return "Erro do Evolution: payload inválido.";
  }
  if (status >= 500) return "Evolution está fora do ar. Tente em alguns minutos.";
  return `Erro inesperado do Evolution (${status}).`;
}
