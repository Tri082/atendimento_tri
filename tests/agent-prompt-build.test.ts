import { describe, expect, test } from "vitest";
import { buildSystemPrompt } from "@/lib/agent/prompts/build";

const baseSettings = {
  agent_name: "Atendente",
  company_name: "Loja do Zé",
  persona: null,
  goal: null,
  tone: "casual" as const,
  never_do: null,
};

describe("buildSystemPrompt", () => {
  test("inclui agent_name + company_name", () => {
    const prompt = buildSystemPrompt(baseSettings, "");
    expect(prompt).toContain("Atendente");
    expect(prompt).toContain("Loja do Zé");
  });

  test("usa defaults quando persona/goal vazios", () => {
    const prompt = buildSystemPrompt(baseSettings, "");
    expect(prompt.toLowerCase()).toContain("cordial");
    expect(prompt.toLowerCase()).toContain("dúvidas");
  });

  test("aplica tone formal", () => {
    const prompt = buildSystemPrompt({ ...baseSettings, tone: "formal" }, "");
    expect(prompt.toLowerCase()).toContain("formal");
  });

  test("inclui never_do quando setado", () => {
    const prompt = buildSystemPrompt(
      { ...baseSettings, never_do: "nunca prometa desconto" },
      "",
    );
    expect(prompt).toContain("nunca prometa desconto");
  });

  test("inclui ragContext quando passado", () => {
    const prompt = buildSystemPrompt(baseSettings, "### Trecho 1\nLorem ipsum");
    expect(prompt).toContain("Lorem ipsum");
  });

  test("usa fallback quando ragContext vazio", () => {
    const prompt = buildSystemPrompt(baseSettings, "");
    expect(prompt).toContain("Nenhum trecho relevante");
  });

  test("inclui referência às tools disponíveis", () => {
    const prompt = buildSystemPrompt(baseSettings, "");
    expect(prompt).toContain("search_knowledge_base");
    expect(prompt).toContain("escalate_to_human");
  });

  test("modo full (default) inclui tools de CRM e regra de escalate_to_human", () => {
    const prompt = buildSystemPrompt(baseSettings, "");
    expect(prompt).toContain("escalate_to_human");
    expect(prompt).toContain("create_contact");
  });

  test("modo faq_only restringe a search_knowledge_base e proíbe preço/design", () => {
    const prompt = buildSystemPrompt(baseSettings, "", "faq_only");
    expect(prompt).toContain("search_knowledge_base");
    expect(prompt).not.toContain("create_contact");
    expect(prompt.toLowerCase()).toContain("vou verificar com nossa equipe");
    expect(prompt.toLowerCase()).toMatch(/nunca fale de preço|nunca.*orçamento/);
  });
});
