/**
 * Normaliza telefone pra formato E.164 (+CCNNNNNNNNN).
 * Default country = Brasil (+55).
 *
 * Heurística simples — não usa libphonenumber pra evitar dep pesada.
 * Para casos complexos (códigos de país obscuros), pode substituir
 * depois sem mudar a interface.
 */

export function normalizePhone(input: string | null | undefined): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (s.length === 0) return null;

  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (digits.length === 0) return null;

  if (hasPlus) {
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return `+${digits}`;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function phoneMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizePhone(a ?? null);
  const nb = normalizePhone(b ?? null);
  if (!na || !nb) return false;
  return na === nb;
}
