import { resolvePath } from "./path";

/**
 * Substitui {{path.to.value}} em qualquer estrutura.
 * Variável inexistente → string vazia. Sem filtros, sem if/else.
 */
export function interpolate(template: unknown, context: Record<string, unknown>): unknown {
  if (typeof template === "string") {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
      const trimmed = path.trim();
      // Sub-H C-5: rejeita path vazio ({{ }} ou {{  }})
      if (trimmed === "") return "";
      const value = resolvePath(context, trimmed);
      if (value == null) return "";
      // Sub-H Round-2 #17: serializa objetos/arrays como JSON em vez de string vazia
      // (aluno vê o conteúdo no body do webhook/email em vez de campo silenciosamente vazio).
      // Cap em 500 chars pra evitar payload gigante em webhook/email.
      if (typeof value === "object") {
        try {
          const json = JSON.stringify(value);
          return json.length > 500 ? `${json.slice(0, 497)}...` : json;
        } catch {
          return "";
        }
      }
      return String(value);
    });
  }
  if (Array.isArray(template)) {
    return template.map((item) => interpolate(item, context));
  }
  if (template !== null && typeof template === "object") {
    return Object.fromEntries(
      Object.entries(template as Record<string, unknown>).map(([k, v]) => [k, interpolate(v, context)]),
    );
  }
  return template;
}
