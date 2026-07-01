/**
 * Navega contexto via dot-path. Suporta índices numéricos em arrays.
 * `resolvePath({contact: {name: "X"}}, "contact.name")` → "X"
 * `resolvePath({steps: [{id: "a"}]}, "steps.0.id")` → "a"
 *
 * NÃO suporta chaves com dot literal: `{ "a.b": "x" }` com path "a.b"
 * sempre splita primeiro — retorna undefined. Decisão consciente
 * (handlebars-style); chaves do contexto devem ser identificadores simples.
 */
export function resolvePath(ctx: unknown, path: string): unknown {
  const keys = path
    .split(".")
    .map((k) => k.trim()); // Sub-H M-5: tolerância a espaços nos dots ("a . b")
  // Sub-H Round-2 #10: path totalmente vazio OU com key vazia no meio ("a..b") retorna undefined.
  // Sem isso, "a..b" trunca silenciosamente — aluno acha que template fechou e fica difícil de
  // debugar (`a..b` poderia vir de `a.{{deep_path}}.b` com deep_path = "").
  if (keys.length === 0) return undefined;
  if (keys.some((k) => k === "")) return undefined;
  return keys.reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const idx = Number(key);
      return Number.isFinite(idx) ? acc[idx] : undefined;
    }
    if (typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, ctx);
}
