import { describe, expect, it } from "vitest";
import {
  createAgentSchema,
  updateAgentSchema,
  deleteAgentSchema,
  setChannelAgentSchema,
  toggleAgentActiveSchema,
} from "@/lib/agent/agents/schemas";

describe("agent CRUD schemas (Zod)", () => {
  it("createAgentSchema aceita input válido", () => {
    const r = createAgentSchema.safeParse({
      orgSlug: "minha-org",
      name: "Vendas",
      tone: "casual",
      daily_token_cap: 200000,
    });
    expect(r.success).toBe(true);
  });

  it("createAgentSchema rejeita name vazio", () => {
    const r = createAgentSchema.safeParse({
      orgSlug: "minha-org",
      name: "",
      tone: "casual",
      daily_token_cap: 200000,
    });
    expect(r.success).toBe(false);
  });

  it("createAgentSchema rejeita tone inválido", () => {
    const r = createAgentSchema.safeParse({
      orgSlug: "minha-org",
      name: "Vendas",
      tone: "engracado",
      daily_token_cap: 200000,
    });
    expect(r.success).toBe(false);
  });

  it("createAgentSchema rejeita cap fora do range", () => {
    const lo = createAgentSchema.safeParse({
      orgSlug: "minha-org",
      name: "Vendas",
      tone: "casual",
      daily_token_cap: 999,
    });
    expect(lo.success).toBe(false);

    const hi = createAgentSchema.safeParse({
      orgSlug: "minha-org",
      name: "Vendas",
      tone: "casual",
      daily_token_cap: 11_000_000,
    });
    expect(hi.success).toBe(false);
  });

  it("updateAgentSchema permite atualização parcial (campos opcionais)", () => {
    const r = updateAgentSchema.safeParse({
      orgSlug: "minha-org",
      agentId: "00000000-0000-0000-0000-000000000001",
      tone: "amigavel",
    });
    expect(r.success).toBe(true);
  });

  it("updateAgentSchema rejeita agentId não-UUID", () => {
    const r = updateAgentSchema.safeParse({
      orgSlug: "minha-org",
      agentId: "nao-eh-uuid",
      tone: "casual",
    });
    expect(r.success).toBe(false);
  });

  it("deleteAgentSchema exige confirmationName não-vazio", () => {
    const ok = deleteAgentSchema.safeParse({
      orgSlug: "minha-org",
      agentId: "00000000-0000-0000-0000-000000000001",
      confirmationName: "Vendas",
    });
    expect(ok.success).toBe(true);

    const empty = deleteAgentSchema.safeParse({
      orgSlug: "minha-org",
      agentId: "00000000-0000-0000-0000-000000000001",
      confirmationName: "",
    });
    expect(empty.success).toBe(false);
  });

  it("setChannelAgentSchema aceita agentId null (desligar)", () => {
    const r = setChannelAgentSchema.safeParse({
      orgSlug: "minha-org",
      channelId: "00000000-0000-0000-0000-000000000001",
      agentId: null,
    });
    expect(r.success).toBe(true);
  });

  it("toggleAgentActiveSchema exige is_active boolean", () => {
    const r = toggleAgentActiveSchema.safeParse({
      orgSlug: "minha-org",
      agentId: "00000000-0000-0000-0000-000000000001",
      is_active: false,
    });
    expect(r.success).toBe(true);
  });
});
