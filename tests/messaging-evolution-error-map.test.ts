import { describe, expect, test } from "vitest";
import { mapEvolutionError } from "@/lib/messaging/adapters/whatsapp-evolution/error-map";

describe("mapEvolutionError", () => {
  test("401 → API key inválida", () => {
    expect(mapEvolutionError(401, null)).toContain("API key inválida");
  });

  test("404 → Instância não encontrada", () => {
    expect(mapEvolutionError(404, null)).toContain("Instância não encontrada");
  });

  test("400 com 'not exist' → Número não tem WhatsApp", () => {
    const body = { message: "phone number does not exist on WhatsApp" };
    expect(mapEvolutionError(400, body)).toContain("Número não tem WhatsApp");
  });

  test("400 com 'connection' → Instância desconectada", () => {
    const body = { message: "instance connection state is closed" };
    expect(mapEvolutionError(400, body)).toContain("desconectada");
  });

  test("400 genérico mantém mensagem original entre prefixo", () => {
    const body = { message: "some specific error" };
    const result = mapEvolutionError(400, body);
    expect(result).toContain("some specific error");
  });

  test("500 → Evolution está fora do ar", () => {
    expect(mapEvolutionError(500, null)).toContain("fora do ar");
  });

  test("503 também trata como server down", () => {
    expect(mapEvolutionError(503, null)).toContain("fora do ar");
  });

  test("status desconhecido → mensagem genérica com o código", () => {
    expect(mapEvolutionError(418, null)).toContain("418");
  });

  test("body como string (texto puro) também extrai", () => {
    const result = mapEvolutionError(400, "request failed: phone does not exist");
    expect(result).toContain("Número não tem WhatsApp");
  });

  test("body undefined não quebra", () => {
    expect(() => mapEvolutionError(400, undefined)).not.toThrow();
  });
});
