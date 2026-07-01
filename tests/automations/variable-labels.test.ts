import { describe, expect, it } from "vitest";
import {
  listVariablesForTrigger,
  getVariableLabel,
} from "@/lib/automations/variable-labels";

describe("variable-labels", () => {
  it("retorna lista com labels amigáveis pro trigger conversation.created", () => {
    const vars = listVariablesForTrigger("conversation.created");
    const phone = vars.find((v) => v.path === "{{contact.phone}}");
    expect(phone).toBeDefined();
    expect(phone?.label).toBe("Telefone do contato");
  });

  it("inclui as variáveis comuns (org, now) com labels", () => {
    const vars = listVariablesForTrigger("conversation.created");
    const orgName = vars.find((v) => v.path === "{{org.name}}");
    expect(orgName?.label).toBe("Nome da sua empresa");
  });

  it("cai pra path como fallback quando não tem label", () => {
    const label = getVariableLabel("trigger.inexistente", "{{algo.qualquer}}");
    expect(label).toBe("{{algo.qualquer}}");
  });

  it("retorna lista vazia pra trigger inexistente", () => {
    expect(listVariablesForTrigger("trigger.que.nao.existe")).toEqual([]);
  });
});
