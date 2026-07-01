import { describe, expect, test } from "vitest";
import { mapMetaError } from "@/lib/messaging/adapters/whatsapp-cloud/error-map";
import { MessagingError } from "@/lib/messaging/errors";

describe("mapMetaError", () => {
  test("rate limit (80007) — retriable", () => {
    const err = mapMetaError({ error: { code: 80007, message: "rate limit" } });
    expect(err).toBeInstanceOf(MessagingError);
    expect(err.code).toBe("rate_limit");
    expect(err.retriable).toBe(true);
    expect(err.publicMessage).toMatch(/Muitas mensagens/);
  });

  test("token expirado (190)", () => {
    const err = mapMetaError({ error: { code: 190, message: "token expired" } });
    expect(err.code).toBe("token_expired");
    expect(err.publicMessage).toMatch(/Reconecte/);
    expect(err.retriable).toBe(false);
  });

  test("fora da janela 24h (131047)", () => {
    const err = mapMetaError({ error: { code: 131047, message: "re-engagement" } });
    expect(err.publicMessage).toMatch(/24h/);
  });

  test("erro genérico desconhecido", () => {
    const err = mapMetaError({ error: { code: 99999, message: "weird" } });
    expect(err.code).toBe("meta_unknown");
    expect(err.publicMessage).toMatch(/cod 99999/);
  });

  test("payload sem error", () => {
    const err = mapMetaError({});
    expect(err.code).toBe("meta_unknown");
  });
});
