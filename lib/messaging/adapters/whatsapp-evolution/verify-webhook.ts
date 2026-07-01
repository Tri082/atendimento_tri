import crypto from "node:crypto";

export function verifyBearer(
  authHeader: string | string[] | undefined,
  secret: string,
): boolean {
  if (!secret || secret.length === 0) return false;
  let token: string | undefined;
  if (Array.isArray(authHeader)) token = authHeader[0];
  else token = authHeader;
  if (typeof token !== "string") return false;
  if (!token.startsWith("Bearer ")) return false;
  const presented = token.slice("Bearer ".length);
  if (presented.length !== secret.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(secret));
  } catch {
    return false;
  }
}
