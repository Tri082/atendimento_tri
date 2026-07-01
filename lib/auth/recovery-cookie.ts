import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * R3-AUTH-001: cookie `recovery_flow` HMAC-signed bound ao user.id.
 *
 * Sem assinatura, XSS em path /reset-password (mesmo httpOnly) podia setar
 * o cookie via header injection raríssimos. Agora valor = `${userId}.${exp}.${hmac}`
 * onde hmac depende de SERVICE_ROLE como secret e do user.id.
 *
 * Atacante sem service_role não consegue forjar.
 */

const RECOVERY_TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for recovery cookie HMAC");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function buildRecoveryCookie(userId: string): string {
  const exp = Date.now() + RECOVERY_TTL_MS;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyRecoveryCookie(value: string | undefined, expectedUserId: string): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [userId, expStr, hmac] = parts;
  if (!userId || !expStr || !hmac) return false;
  if (userId !== expectedUserId) return false;
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(`${userId}.${expStr}`);
  try {
    const a = Buffer.from(hmac, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
