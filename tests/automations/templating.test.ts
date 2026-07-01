import { describe, expect, test } from "vitest";
import { interpolate } from "@/lib/automations/templating";

describe("interpolate", () => {
  test("substitui {{var}} simples", () => {
    expect(interpolate("Olá {{name}}", { name: "João" })).toBe("Olá João");
  });
  test("paths aninhados {{contact.name}}", () => {
    expect(interpolate("Oi {{contact.name}}", { contact: { name: "Maria" } })).toBe("Oi Maria");
  });
  test("variável inexistente vira string vazia", () => {
    expect(interpolate("Oi {{contact.name}}", {})).toBe("Oi ");
  });
  test("múltiplas substituições", () => {
    expect(interpolate("{{a}} e {{b}}", { a: "X", b: "Y" })).toBe("X e Y");
  });
  test("trim em espaços", () => {
    expect(interpolate("Oi {{ contact.name }}", { contact: { name: "Z" } })).toBe("Oi Z");
  });
  test("number/bool/null → string", () => {
    expect(interpolate("{{n}} {{b}} {{x}}", { n: 42, b: true, x: null })).toBe("42 true ");
  });
  test("indexa array via {{steps.0.id}}", () => {
    expect(interpolate("{{steps.0.id}}", { steps: [{ id: "abc" }] })).toBe("abc");
  });
  test("recursão em array", () => {
    expect(interpolate(["{{a}}", "{{b}}"], { a: "X", b: "Y" })).toEqual(["X", "Y"]);
  });
  test("recursão em object", () => {
    expect(interpolate({ to: "{{phone}}", text: "Oi {{name}}" }, { phone: "+55", name: "A" }))
      .toEqual({ to: "+55", text: "Oi A" });
  });
  test("primitivos não-string intactos", () => {
    expect(interpolate({ value: 100, enabled: true }, {})).toEqual({ value: 100, enabled: true });
  });
  test("strings sem placeholder intactas", () => {
    expect(interpolate("nada aqui", { x: "y" })).toBe("nada aqui");
  });
  test("objects aninhados", () => {
    expect(interpolate({ outer: { inner: "{{x}}", n: 5 } }, { x: "ok" }))
      .toEqual({ outer: { inner: "ok", n: 5 } });
  });
  test("chaves com dot literal NÃO são acessíveis (path splita primeiro)", () => {
    // Decisão consciente: handlebars-style dot path
    expect(interpolate("{{a.b}}", { "a.b": "x" })).toBe("");
  });
  test("regex não-recursivo: placeholder 'aninhado' não quebra (não há backtrack catastrófico)", () => {
    // [^}]+ no regex impede match de }}} antes do fim
    expect(typeof interpolate("{{a{{b}}}}", { a: "X", b: "Y" })).toBe("string");
  });
  // Sub-H Round-2 #17: objetos/arrays viram JSON serializado (não [object Object] nem vazio)
  test("objeto vira JSON serializado (não [object Object] nem vazio)", () => {
    expect(interpolate("{{x}}", { x: { a: 1 } })).toBe('{"a":1}');
  });
  test("array vira JSON serializado", () => {
    expect(interpolate("{{x}}", { x: [1, 2, 3] })).toBe("[1,2,3]");
  });
  test("JSON gigante é truncado em 500 chars + '...'", () => {
    const big = { data: "x".repeat(1000) };
    const result = interpolate("{{x}}", { x: big });
    expect(typeof result).toBe("string");
    expect((result as string).length).toBeLessThanOrEqual(500);
    expect((result as string).endsWith("...")).toBe(true);
  });
  // Sub-H C-5: path vazio retorna ""
  test("path vazio {{ }} retorna vazio", () => {
    expect(interpolate("a{{ }}b", { secret: "x" })).toBe("ab");
  });
});
