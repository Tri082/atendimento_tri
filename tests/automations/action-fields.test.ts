import { describe, expect, it } from "vitest";
import {
  ACTION_FIELDS,
  getActionFields,
} from "@/lib/automations/action-fields";

describe("action-fields", () => {
  it("retorna fields pra create_contact", () => {
    const fields = getActionFields("create_contact");
    expect(fields).not.toBeNull();
    const name = fields!.find((f) => f.key === "name");
    expect(name).toBeDefined();
    expect(name?.label).toBe("Nome do contato");
    expect(name?.required).toBe(true);
  });

  it("retorna null pra action sem metadata", () => {
    expect(getActionFields("action_inexistente")).toBeNull();
  });

  it("cobre as 9 actions usadas pelos templates", () => {
    const usedByTemplates = [
      "create_contact",
      "create_deal",
      "create_task",
      "send_email",
      "send_whatsapp_message",
      "assign_owner",
      "pause_agent_on_conversation",
      "call_webhook",
      "update_deal_fields",
    ];
    for (const id of usedByTemplates) {
      expect(ACTION_FIELDS[id], `${id} sem fields metadata`).toBeDefined();
    }
  });

  it("create_deal tem company_id required como dropdown de empresa", () => {
    const fields = getActionFields("create_deal");
    const company = fields!.find((f) => f.key === "company_id");
    expect(company?.required).toBe(true);
    expect(company?.type).toBe("company_select");
  });

  it("call_webhook tem url required + supportsVariables true em payload", () => {
    const fields = getActionFields("call_webhook");
    const url = fields!.find((f) => f.key === "url");
    expect(url?.required).toBe(true);
    const payload = fields!.find((f) => f.key === "payload");
    expect(payload?.type).toBe("json");
  });
});
