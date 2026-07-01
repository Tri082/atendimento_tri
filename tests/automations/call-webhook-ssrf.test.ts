import { describe, expect, test } from "vitest";
import { isSafeWebhookUrl } from "@/lib/automations/actions/call-webhook";

describe("isSafeWebhookUrl (SSRF guard)", () => {
  test("https público OK", () => {
    expect(isSafeWebhookUrl("https://hooks.zapier.com/abc")).toBe(true);
    expect(isSafeWebhookUrl("https://api.example.com/webhook")).toBe(true);
  });
  test("http rejeitado", () => {
    expect(isSafeWebhookUrl("http://api.example.com")).toBe(false);
  });
  test("file/ftp/data rejeitados", () => {
    expect(isSafeWebhookUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeWebhookUrl("ftp://example.com")).toBe(false);
    expect(isSafeWebhookUrl("data:text/plain,oi")).toBe(false);
  });
  test("RFC1918 e loopback bloqueados", () => {
    expect(isSafeWebhookUrl("https://10.0.0.5")).toBe(false);
    expect(isSafeWebhookUrl("https://10.255.255.1")).toBe(false);
    expect(isSafeWebhookUrl("https://172.16.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://172.31.255.255")).toBe(false);
    expect(isSafeWebhookUrl("https://192.168.1.1")).toBe(false);
    expect(isSafeWebhookUrl("https://127.0.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://localhost")).toBe(false);
  });
  test("169.254 (link-local) bloqueado", () => {
    expect(isSafeWebhookUrl("https://169.254.169.254")).toBe(false);
  });
  test("URL inválida rejeitada", () => {
    expect(isSafeWebhookUrl("not-a-url")).toBe(false);
  });
  // Sub-H C-4: formas alternativas de IPv4 que bypassam o parser dotted
  test("IPv4 decimal puro bloqueado (2130706433 = 127.0.0.1)", () => {
    expect(isSafeWebhookUrl("https://2130706433/x")).toBe(false);
  });
  test("IPv4 hex bloqueado (0x7f000001 = 127.0.0.1)", () => {
    expect(isSafeWebhookUrl("https://0x7f000001/x")).toBe(false);
  });
  test("IPv4 octal nas partes bloqueado (0177.0.0.1)", () => {
    expect(isSafeWebhookUrl("https://0177.0.0.1/x")).toBe(false);
  });
  test("0.0.0.0 bloqueado", () => {
    expect(isSafeWebhookUrl("https://0.0.0.0/x")).toBe(false);
  });
  test("IPv6 loopback ([::1]) bloqueado", () => {
    expect(isSafeWebhookUrl("https://[::1]/x")).toBe(false);
  });
  // Sub-H Round-2 #14: amplia bloqueios SSRF (CGN + multicast + broadcast)
  test("CGN 100.64/10 bloqueado", () => {
    expect(isSafeWebhookUrl("https://100.64.0.5/x")).toBe(false);
    expect(isSafeWebhookUrl("https://100.127.255.1/x")).toBe(false);
  });
  test("CGN borders permitidos (100.63 / 100.128)", () => {
    expect(isSafeWebhookUrl("https://100.63.0.1/x")).toBe(true);
    expect(isSafeWebhookUrl("https://100.128.0.1/x")).toBe(true);
  });
  test("multicast 224/4 bloqueado", () => {
    expect(isSafeWebhookUrl("https://224.0.0.1/x")).toBe(false);
    expect(isSafeWebhookUrl("https://239.255.255.255/x")).toBe(false);
  });
  test("broadcast 255.255.255.255 bloqueado", () => {
    expect(isSafeWebhookUrl("https://255.255.255.255/x")).toBe(false);
  });
  test("reserved 240/4 bloqueado", () => {
    expect(isSafeWebhookUrl("https://240.0.0.1/x")).toBe(false);
  });
  // Sub-H Round-2 #15: hostname vazio (defesa em profundidade — Node URL parser
  // não produz hostname vazio em URLs normais, mas se algum dia mudar OU se outro
  // parser pre-processar a URL e zerar host, o check pega).
  // URL inválida sem hostname (apenas scheme) é rejeitada via URL ctor throw.
  test("URL sem hostname (só scheme) rejeitada", () => {
    expect(isSafeWebhookUrl("https://")).toBe(false);
  });
});
