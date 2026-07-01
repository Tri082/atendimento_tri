import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { AUTOMATION_LIMITS } from "../limits";
import type { ActionDefinition } from "../schemas";

const inputSchema = z.object({
  url: z.string().url(),
  webhook_secret: z.string().min(16).max(200),
  payload: z.record(z.string(), z.unknown()).default({}),
  headers: z.record(z.string(), z.string()).optional(),
});
type Input = z.infer<typeof inputSchema>;
type Output = { status: number; response_preview: string };

/**
 * Guard SSRF: aceita HTTPS público, rejeita HTTP, schemes não-web, e IPs internos.
 *
 * - HTTPS obrigatório
 * - Bloqueia 10/8, 127/8, 172.16-31/12, 192.168/16, 169.254/16, 0.0.0.0, localhost
 * - Bloqueia formas alternativas de IPv4 (decimal puro, hex 0x..., octal 0...)
 * - Bloqueia qualquer IPv6 (forma `[...]`)
 * - Hostnames públicos (não-IP) passam — DNS rebinding fica como melhoria futura
 *
 * Sub-H C-4: parser robusto contra bypass via 2130706433 (=127.0.0.1) etc.
 */
export function isSafeWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  // Sub-H Round-2 #15: rejeita hostname vazio (https:///path em alguns parsers)
  if (host === "" || host === "localhost") return false;

  // Bloquear IPv6 (qualquer forma — `[::1]`, `[fc00::]`, etc. chegam com `:`)
  if (host.includes(":")) return false;

  // Bloquear formas alternativas de IPv4
  // Decimal puro: "2130706433" (= 127.0.0.1)
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (Number.isFinite(n) && n > 0) return false;
  }
  // Hex: "0x7f000001"
  if (/^0x[0-9a-f]+$/i.test(host)) return false;
  // Octal nas partes dotted: "0177.0.0.1" ou similar
  const parts = host.split(".");
  if (parts.some((p) => /^0\d+$/.test(p))) return false;

  // Forma dotted decimal padrão (IPv4)
  if (isIP(host) === 4) {
    const nums = host.split(".").map(Number);
    if (nums.length !== 4) return false;
    const [a, b] = nums;
    if (a === undefined) return false; // TS strict guard (após length-check é unreachable)
    if (a === 0) return false; // 0.0.0.0/8
    if (a === 10) return false; // private 10/8
    if (a === 127) return false; // loopback
    if (a === 169 && b === 254) return false; // link-local
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return false; // private
    if (a === 192 && b === 168) return false; // private
    // Sub-H Round-2 #14: amplia bloqueios SSRF
    if (a === 100 && b !== undefined && b >= 64 && b <= 127) return false; // CGN 100.64/10
    if (a >= 224 && a <= 239) return false; // multicast 224/4
    if (a === 240 || a === 255) return false; // reserved + broadcast 255.255.255.255
    return true;
  }

  // Hostname público (não-IP, não-localhost, não-IPv6, não forma alternativa)
  return true;
}

export const callWebhookAction: ActionDefinition<Input, Output> = {
  id: "call_webhook",
  label: "Chamar webhook externo",
  description:
    "Faz POST HTTPS em uma URL externa com payload JSON. Assinado com HMAC SHA256 (header 'x-automation-signature').",
  category: "external",
  inputSchema,
  async execute(input, _ctx) {
    if (!isSafeWebhookUrl(input.url)) {
      throw new Error(
        "call_webhook: URL não permitida (precisa ser HTTPS público, sem IPs internos)",
      );
    }
    const body = JSON.stringify(input.payload);
    const signature = createHmac("sha256", input.webhook_secret)
      .update(body)
      .digest("hex");
    // Sub-H Round-2 #8: rejeita TODOS control chars (RFC 7230 — visible US-ASCII
    // + space/tab são os únicos permitidos em header field-content).
    // Cobre \r, \n, \t, NUL, e demais control chars que poderiam fazer
    // header injection / request smuggling.
    const CONTROL_CHAR_RE = /[\x00-\x08\x0a-\x1f\x7f]/;
    const safeHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.headers ?? {})) {
      if (CONTROL_CHAR_RE.test(k)) {
        throw new Error("call_webhook: header name com control char rejeitado");
      }
      const strV = String(v);
      if (CONTROL_CHAR_RE.test(strV)) {
        throw new Error("call_webhook: header value com control char rejeitado");
      }
      safeHeaders[k] = strV;
    }
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      AUTOMATION_LIMITS.STEP_TIMEOUT_MS,
    );
    try {
      const res = await fetch(input.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-automation-signature": signature,
          ...safeHeaders,
        },
        body,
        signal: controller.signal,
      });
      const text = await res.text();
      return { status: res.status, response_preview: text.slice(0, 500) };
    } finally {
      clearTimeout(timeout);
    }
  },
  async simulate(input) {
    return {
      status: 200,
      response_preview: `DRY-RUN would POST to ${input.url}`,
    };
  },
};
