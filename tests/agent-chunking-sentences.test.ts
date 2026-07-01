import { describe, expect, test } from "vitest";
import { splitSentences } from "@/lib/agent/rag/chunking/sentences";

describe("splitSentences", () => {
  test("string vazia retorna []", () => {
    expect(splitSentences("")).toEqual([]);
  });

  test("uma frase sem pontuação vira 1 sentence", () => {
    expect(splitSentences("texto sem pontuação")).toEqual(["texto sem pontuação"]);
  });

  test("duas frases simples", () => {
    expect(splitSentences("Primeira. Segunda.")).toEqual(["Primeira.", "Segunda."]);
  });

  test("ponto de interrogação e exclamação são boundaries", () => {
    expect(splitSentences("Que horas são? Não sei! Vamos descobrir.")).toEqual([
      "Que horas são?",
      "Não sei!",
      "Vamos descobrir.",
    ]);
  });

  test("preserva abreviação Dr. (não quebra)", () => {
    expect(splitSentences("Atendido pelo Dr. Silva ontem.")).toEqual([
      "Atendido pelo Dr. Silva ontem.",
    ]);
  });

  test("preserva abreviação Sra.", () => {
    expect(splitSentences("Falei com a Sra. Costa hoje.")).toEqual([
      "Falei com a Sra. Costa hoje.",
    ]);
  });

  test("preserva p.ex.", () => {
    expect(splitSentences("Use ferramentas, p.ex. lápis e papel, para começar.")).toEqual([
      "Use ferramentas, p.ex. lápis e papel, para começar.",
    ]);
  });

  test("preserva siglas (S.A., EUA)", () => {
    expect(splitSentences("A empresa S.A. atende nos EUA.")).toEqual([
      "A empresa S.A. atende nos EUA.",
    ]);
  });

  test("preserva número decimal pt-BR (R$ 1.500,00)", () => {
    expect(splitSentences("O valor é R$ 1.500,00 por mês.")).toEqual([
      "O valor é R$ 1.500,00 por mês.",
    ]);
  });

  test("preserva percentual decimal (1.5%)", () => {
    expect(splitSentences("Crescimento de 1.5% no trimestre.")).toEqual([
      "Crescimento de 1.5% no trimestre.",
    ]);
  });

  test("preserva URL com pontos", () => {
    expect(splitSentences("Acesse https://exemplo.com.br/pagina hoje mesmo.")).toEqual([
      "Acesse https://exemplo.com.br/pagina hoje mesmo.",
    ]);
  });

  test("preserva email com pontos", () => {
    expect(splitSentences("Email para contato@exemplo.com.br se precisar.")).toEqual([
      "Email para contato@exemplo.com.br se precisar.",
    ]);
  });

  test("quebra em frases mesmo com pt-BR + en misturado", () => {
    expect(
      splitSentences("Eu preciso de help. O cliente said yes ontem."),
    ).toEqual(["Eu preciso de help.", "O cliente said yes ontem."]);
  });

  test("trim resultados (sem espaços nas pontas)", () => {
    const out = splitSentences("  Frase um.   Frase dois.  ");
    expect(out).toEqual(["Frase um.", "Frase dois."]);
  });

  test("ignora sentences vazias", () => {
    expect(splitSentences("Texto. . . final.")).toEqual(["Texto.", "final."]);
  });
});
