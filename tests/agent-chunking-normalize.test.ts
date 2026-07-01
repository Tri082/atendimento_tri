import { describe, expect, test } from "vitest";
import { normalizeText } from "@/lib/agent/rag/chunking/normalize";

describe("normalizeText", () => {
  test("string vazia retorna ''", () => {
    expect(normalizeText("")).toBe("");
  });

  test("converte CRLF em LF", () => {
    expect(normalizeText("a\r\nb")).toBe("a\nb");
  });

  test("comprime espaços e tabs DENTRO da linha", () => {
    expect(normalizeText("foo    bar\tbaz")).toBe("foo bar baz");
  });

  test("preserva quebra de parágrafo (\\n\\n)", () => {
    expect(normalizeText("um\n\ndois")).toBe("um\n\ndois");
  });

  test("comprime 3+ quebras consecutivas em apenas duas", () => {
    expect(normalizeText("um\n\n\n\ndois")).toBe("um\n\ndois");
  });

  test("trim por linha (remove espaços iniciais/finais)", () => {
    expect(normalizeText("  foo  \n  bar  ")).toBe("foo\nbar");
  });

  test("trim global no início e fim", () => {
    expect(normalizeText("\n\n  foo  \n\n")).toBe("foo");
  });

  test("não destrói quebra simples \\n entre linhas (mantém estrutura)", () => {
    expect(normalizeText("linha1\nlinha2")).toBe("linha1\nlinha2");
  });

  test("preserva ordem após cleanup", () => {
    const input = "Título\n\nParágrafo 1.\nLinha 2 do parágrafo 1.\n\nParágrafo 2.";
    const out = normalizeText(input);
    expect(out).toBe("Título\n\nParágrafo 1.\nLinha 2 do parágrafo 1.\n\nParágrafo 2.");
  });
});
