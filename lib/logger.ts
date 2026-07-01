/**
 * R3-INF-005: helper de log que NÃO serializa objetos completos do Supabase.
 * Loga só { code, message } e trunca message a 200 chars. Evita PII (emails,
 * tokens, details/hint) em stdout persistido por orchestrators.
 */
type ErrLike = { code?: string; message?: string } | Error | unknown;

export function logError(scope: string, err: ErrLike): void {
  if (err == null) {
    console.error(`[${scope}] error: <null>`);
    return;
  }
  const obj = err as { code?: string; message?: string; name?: string };
  const code = obj.code ?? obj.name ?? "unknown";
  const msg = (obj.message ?? "").slice(0, 200);
  console.error(`[${scope}] ${code}: ${msg}`);
}
