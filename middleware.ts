import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/reset-password", "/verify-email"];

/**
 * M3: whitelist de extensões estáticas.
 */
const STATIC_EXT_WHITELIST = new Set([
  "svg",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "ico",
  "css",
  "js",
  "map",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "txt",
  "xml",
  "json",
]);

function isStaticAsset(pathname: string): boolean {
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot === -1) return false;
  const ext = pathname.slice(lastDot + 1).toLowerCase();
  return STATIC_EXT_WHITELIST.has(ext);
}

/**
 * Rate limit em memória (best-effort single-instance).
 */
const authRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const RATE_MAP_HARD_CAP = 10_000;
const AUTH_PATHS = ["/login", "/signup", "/reset-password"];
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
const IS_DEV = process.env.NODE_ENV !== "production";

if (process.env.NODE_ENV === "production" && !TRUST_PROXY) {
  console.warn(
    "[middleware] AVISO: TRUST_PROXY=1 não setado em produção. Rate limit por IP fica degradado.",
  );
}

function ipFromRequest(req: NextRequest): string {
  if (TRUST_PROXY) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
      const parts = xff.split(",");
      const last = parts[parts.length - 1];
      if (last) return last.trim();
    }
    const real = req.headers.get("x-real-ip");
    if (real) return real;
  }
  return "unknown-ip";
}

function sweepExpired(now: number) {
  if (authRateLimit.size < RATE_MAP_HARD_CAP) return;
  for (const [k, v] of authRateLimit) {
    if (now > v.resetAt) authRateLimit.delete(k);
  }
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  sweepExpired(now);
  const entry = authRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    authRateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}

/**
 * R4-HIGH-2: rate-limit qualquer Server Action POST de fora de /app/[orgSlug]
 * (Next-Action header presente em qualquer POST que invoca Server Action).
 * Caso normal de uso (POST em /app/[orgSlug]/...) NÃO é rate-limited aqui;
 * fica isento porque user já está autenticado e tem RLS.
 *
 * Vetor que isso fecha: atacante invoca `signInAction` via `Next-Action` em
 * `POST /` ou outra rota fora de AUTH_PATHS, contornando o gate antigo.
 */
function shouldRateLimitAuthLike(req: NextRequest): boolean {
  // Em dev sem TRUST_PROXY, todos os requests caem no bucket "unknown-ip" e
  // batem no cap rapidinho — desliga rate limit em dev pra não atrapalhar.
  if (IS_DEV) return false;

  if (req.method !== "POST") return false;
  const { pathname } = req.nextUrl;

  // POST direto em rotas de auth (forms tradicionais)
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }

  // Server Action POST FORA de /app/[orgSlug] — bypass conhecido do rate limit.
  // Rotas autenticadas (/app/...) seguem o fluxo normal.
  if (req.headers.get("next-action") && !pathname.startsWith("/app/")) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (shouldRateLimitAuthLike(request)) {
    const ip = ipFromRequest(request);
    if (!rateLimit(ip)) {
      return new NextResponse("Muitas tentativas. Aguarde alguns minutos.", {
        status: 429,
      });
    }
  }

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    // Webhooks de provedores externos (WhatsApp, Telegram, etc.) — handlers
    // validam autenticidade via verifyWebhook (HMAC ou bearer secret).
    pathname.startsWith("/api/webhooks/") ||
    // Cron jobs (Vercel/Easypanel) — handlers validam via CRON_SECRET bearer.
    pathname.startsWith("/api/cron/") ||
    isStaticAsset(pathname);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
