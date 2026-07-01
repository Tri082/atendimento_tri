import { describe, expect, test } from "vitest";
import {
  ACTIONS,
  TRIGGERS,
  getAction,
  getTrigger,
} from "@/lib/automations/registry";

describe("registry", () => {
  test("contém os 11 triggers (7 MVP + 4 de tag)", () => {
    expect(Object.keys(TRIGGERS).sort()).toEqual([
      "agent.escalated",
      "contact.created",
      "contact.tag_added",
      "contact.tag_removed",
      "conversation.created",
      "conversation.tag_added",
      "deal.created",
      "deal.stage_changed",
      "deal.tag_added",
      "message.received",
      "task.completed",
    ]);
  });

  test("contém as 21 actions (14 MVP + 7 de tag)", () => {
    expect(Object.keys(ACTIONS).length).toBe(21);
  });

  test("toda action tem campos obrigatórios", () => {
    for (const action of Object.values(ACTIONS)) {
      expect(action.id).toBeTruthy();
      expect(action.label).toBeTruthy();
      expect(action.inputSchema).toBeTruthy();
      expect(typeof action.execute).toBe("function");
      expect(typeof action.simulate).toBe("function");
    }
  });

  test("todo trigger.sampleContext valida contra contextSchema", () => {
    for (const trigger of Object.values(TRIGGERS)) {
      const result = trigger.contextSchema.safeParse(trigger.sampleContext);
      expect(result.success, `${trigger.id}.sampleContext deve passar`).toBe(
        true,
      );
    }
  });

  test("getTrigger / getAction retornam por id", () => {
    expect(getTrigger("conversation.created")?.id).toBe("conversation.created");
    expect(getAction("create_contact")?.id).toBe("create_contact");
    expect(getTrigger("nao_existe")).toBeUndefined();
    expect(getAction("nao_existe")).toBeUndefined();
  });
});
