import { describe, expect, test } from "vitest";
import { isRetriable, MessagingError, translateError } from "@/lib/messaging/errors";

describe("MessagingError", () => {
  test("constrói com code, publicMessage e retriable", () => {
    const err = new MessagingError({
      code: "rate_limit",
      publicMessage: "Muitas mensagens. Tente em 1 minuto.",
      retriable: true,
    });
    expect(err.code).toBe("rate_limit");
    expect(err.publicMessage).toBe("Muitas mensagens. Tente em 1 minuto.");
    expect(err.retriable).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  test("herda message padrão de publicMessage", () => {
    const err = new MessagingError({
      code: "x",
      publicMessage: "oi",
      retriable: false,
    });
    expect(err.message).toBe("oi");
  });
});

describe("translateError", () => {
  test("MessagingError retorna seu publicMessage", () => {
    const err = new MessagingError({
      code: "foo",
      publicMessage: "Mensagem leiga",
      retriable: false,
    });
    expect(translateError(err)).toBe("Mensagem leiga");
  });

  test("Error genérico retorna mensagem genérica", () => {
    expect(translateError(new Error("internal stack trace"))).toBe(
      "Não foi possível enviar a mensagem. Tente novamente em instantes.",
    );
  });

  test("null retorna mensagem genérica", () => {
    expect(translateError(null)).toBe(
      "Não foi possível enviar a mensagem. Tente novamente em instantes.",
    );
  });

  test("erro PostgREST com code retorna mensagem específica", () => {
    expect(translateError({ code: "PGRST116", message: "..." })).toBe("Item não encontrado.");
  });
});

describe("isRetriable", () => {
  test("MessagingError com retriable=true", () => {
    const err = new MessagingError({ code: "x", publicMessage: "y", retriable: true });
    expect(isRetriable(err)).toBe(true);
  });

  test("Error genérico não é retriable", () => {
    expect(isRetriable(new Error("x"))).toBe(false);
  });
});
