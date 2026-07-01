/**
 * Decide o que exibir como nome + iniciais do "contato" de uma conversation,
 * com prioridade:
 *   1. contato cadastrado no CRM (mais autoritativo)
 *   2. display_name vindo do provider externo (pushName WhatsApp, etc.)
 *   3. external_thread_id (telefone bruto — último recurso)
 *
 * Retorna `initials: null` quando só temos o telefone — a UI mostra ícone
 * genérico em vez de "+5" ou "55" cortado.
 */
export interface DisplayInput {
  contact?: { name?: string | null } | null;
  display_name?: string | null;
  external_thread_id: string;
}

export interface DisplayResult {
  name: string;
  initials: string | null;
  hasRealName: boolean;
}

function looksLikePhone(s: string): boolean {
  // Heurística simples: começa com + ou é só dígitos/separadores comuns.
  const trimmed = s.trim();
  if (trimmed.startsWith("+")) return true;
  return /^[\d\s().-]+$/.test(trimmed);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function resolveConversationDisplay(c: DisplayInput): DisplayResult {
  const real = c.contact?.name?.trim() || c.display_name?.trim() || "";
  if (real) {
    return { name: real, initials: initialsFromName(real), hasRealName: true };
  }
  // Só temos o telefone — devolve sem iniciais pra UI decidir mostrar ícone.
  return {
    name: c.external_thread_id,
    initials: looksLikePhone(c.external_thread_id) ? null : c.external_thread_id.slice(0, 2).toUpperCase(),
    hasRealName: false,
  };
}
