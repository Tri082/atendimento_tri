import type { NextConfig } from "next";

// NEW-HIGH-4: fail-build se NEXT_PUBLIC_APP_URL não estiver setada em prod.
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error("NEXT_PUBLIC_APP_URL é obrigatório em produção. Defina no env do deploy.");
}

const IS_PROD = process.env.NODE_ENV === "production";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
  : "http://localhost:3000";
const APP_HOST = new URL(APP_ORIGIN).host;

// Em dev o Next pode pegar porta diferente se 3000 estiver ocupada.
// Server Actions exigem allowedOrigins batendo com o host real — sem isso
// o form falha com "An unexpected response was received from the server".
const DEV_ALLOWED_HOSTS = IS_PROD
  ? []
  : Array.from({ length: 11 }, (_, i) => `localhost:${3000 + i}`);

const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "https://*.supabase.co";

/**
 * R3-INF-001: CSP endurecida.
 * - 'unsafe-eval' removido em PROD (Next standalone não precisa).
 * - 'unsafe-inline' permanece para scripts (Next 16 RSC streaming) — refinar
 *   com nonce-based CSP em release subsequente via middleware.
 * - connect-src condicional ao provider LLM configurado.
 */
const llmConnectSrc = (() => {
  const provider = process.env.LLM_PROVIDER?.toLowerCase();
  const urls: string[] = [];
  if (!provider || provider === "anthropic") urls.push("https://api.anthropic.com");
  if (!provider || provider === "openai") urls.push("https://api.openai.com");
  return urls.join(" ");
})();

const scriptSrc = IS_PROD
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} wss://*.supabase.co ${llmConnectSrc}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=86400; includeSubDomains",
  },
  // R3-INF-001: ainda Report-Only enquanto refina nonces.
  { key: "Content-Security-Policy-Report-Only", value: CSP_DIRECTIVES },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [APP_HOST, ...DEV_ALLOWED_HOSTS],
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
