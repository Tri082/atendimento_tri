import { describe, expect, test } from "vitest";
import { splitBlocks } from "@/lib/agent/rag/chunking/blocks";

describe("splitBlocks", () => {
  test("texto vazio retorna []", () => {
    expect(splitBlocks("")).toEqual([]);
  });

  test("um parágrafo simples vira 1 block paragraph", () => {
    const blocks = splitBlocks("Esse é um parágrafo qualquer.");
    expect(blocks).toEqual([{ kind: "paragraph", text: "Esse é um parágrafo qualquer." }]);
  });

  test("dois parágrafos separados por \\n\\n viram 2 blocks", () => {
    const blocks = splitBlocks("Primeiro parágrafo.\n\nSegundo parágrafo.");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ kind: "paragraph", text: "Primeiro parágrafo." });
    expect(blocks[1]).toEqual({ kind: "paragraph", text: "Segundo parágrafo." });
  });

  test("detecta heading via numeração (1.)", () => {
    const blocks = splitBlocks("1. Introdução\n\nTexto do capítulo.");
    expect(blocks[0]?.kind).toBe("heading");
    expect(blocks[0]?.text).toBe("1. Introdução");
  });

  test("detecta heading via numeração aninhada (1.2.3)", () => {
    const blocks = splitBlocks("1.2.3 Subsubseção\n\nConteúdo.");
    expect(blocks[0]?.kind).toBe("heading");
  });

  test("detecta heading via UPPERCASE com 3+ palavras", () => {
    const blocks = splitBlocks("CAPÍTULO TRÊS COMEÇA\n\nTexto normal aqui.");
    expect(blocks[0]?.kind).toBe("heading");
  });

  test("NÃO detecta heading se UPPERCASE tem só 1-2 palavras (pode ser sigla)", () => {
    const blocks = splitBlocks("CEO\n\nTexto.");
    expect(blocks[0]?.kind).toBe("paragraph");
  });

  test("detecta heading via linha curta (<80 chars) seguida de blank", () => {
    const blocks = splitBlocks("Introdução\n\nEste é o conteúdo da introdução, que pode ser longo.");
    expect(blocks[0]?.kind).toBe("heading");
    expect(blocks[0]?.text).toBe("Introdução");
  });

  test("NÃO detecta heading se linha curta NÃO seguida de blank", () => {
    const blocks = splitBlocks("Frase curta.\nOutra frase no mesmo parágrafo.");
    expect(blocks[0]?.kind).toBe("paragraph");
  });

  test("detecta list-item com hífen", () => {
    const blocks = splitBlocks("- Item um\n- Item dois\n- Item três");
    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.kind === "list-item")).toBe(true);
  });

  test("detecta list-item com asterisco", () => {
    const blocks = splitBlocks("* Maçã\n* Banana");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.kind).toBe("list-item");
  });

  test("detecta list-item com bullet unicode", () => {
    const blocks = splitBlocks("• Primeiro\n• Segundo");
    expect(blocks[0]?.kind).toBe("list-item");
  });

  test("detecta list-item numerado (1)", () => {
    const blocks = splitBlocks("1) Passo um\n2) Passo dois");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.kind).toBe("list-item");
    expect(blocks[0]?.text).toBe("1) Passo um");
  });

  test("misto heading + parágrafos + lista", () => {
    const input =
      "Título do Documento\n\n" +
      "Parágrafo introdutório explicando o tema.\n\n" +
      "- Item 1\n- Item 2\n\n" +
      "Parágrafo final.";
    const blocks = splitBlocks(input);
    expect(blocks).toHaveLength(5);
    expect(blocks[0]?.kind).toBe("heading");
    expect(blocks[1]?.kind).toBe("paragraph");
    expect(blocks[2]?.kind).toBe("list-item");
    expect(blocks[3]?.kind).toBe("list-item");
    expect(blocks[4]?.kind).toBe("paragraph");
  });
});
