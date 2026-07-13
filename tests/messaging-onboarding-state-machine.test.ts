import { describe, expect, test } from "vitest";
import { advanceOnboarding } from "@/lib/messaging/onboarding/state-machine";

describe("advanceOnboarding", () => {
  test("greeting_name aceita texto e avança pra first_order_check", () => {
    const r = advanceOnboarding("greeting_name", { kind: "text", text: "Maria" }, {});
    expect(r).toMatchObject({ ok: true, nextStepId: "first_order_check", handoff: false });
    if (r.ok) expect(r.answers.name).toBe("Maria");
  });

  test("greeting_name rejeita texto vazio", () => {
    const r = advanceOnboarding("greeting_name", { kind: "text", text: "   " }, {});
    expect(r.ok).toBe(false);
  });

  test("first_order_check=sim vai pro bloco I (source)", () => {
    const r = advanceOnboarding(
      "first_order_check",
      { kind: "button", optionId: "sim" },
      { name: "Maria" },
    );
    expect(r).toMatchObject({ ok: true, nextStepId: "source", handoff: false });
    if (r.ok) expect(r.answers.isFirstOrder).toBe(true);
  });

  test("first_order_check=nao vai pro bloco II (repeat_layout_check)", () => {
    const r = advanceOnboarding(
      "first_order_check",
      { kind: "button", optionId: "nao" },
      { name: "Maria" },
    );
    expect(r).toMatchObject({ ok: true, nextStepId: "repeat_layout_check", handoff: false });
    if (r.ok) expect(r.answers.isFirstOrder).toBe(false);
  });

  test("first_order_check rejeita optionId inválido", () => {
    const r = advanceOnboarding("first_order_check", { kind: "button", optionId: "talvez" }, {});
    expect(r.ok).toBe(false);
  });

  test("source=indicacao pede quem indicou (referred_by)", () => {
    const r = advanceOnboarding("source", { kind: "button", optionId: "indicacao" }, {});
    expect(r).toMatchObject({ ok: true, nextStepId: "referred_by", handoff: false });
    if (r.ok) expect(r.answers.source).toBe("indicacao");
  });

  test("source=instagram pula direto pra use_case", () => {
    const r = advanceOnboarding("source", { kind: "button", optionId: "instagram" }, {});
    expect(r).toMatchObject({ ok: true, nextStepId: "use_case", handoff: false });
  });

  test("referred_by aceita texto livre e avança pra use_case", () => {
    const r = advanceOnboarding("referred_by", { kind: "text", text: "João da Silva" }, {});
    expect(r).toMatchObject({ ok: true, nextStepId: "use_case", handoff: false });
    if (r.ok) expect(r.answers.referredBy).toBe("João da Silva");
  });

  test("use_case avança pra layout_status", () => {
    const r = advanceOnboarding("use_case", { kind: "button", optionId: "eventos" }, {});
    expect(r).toMatchObject({ ok: true, nextStepId: "layout_status", handoff: false });
  });

  test("layout_status avança pra files_status", () => {
    const r = advanceOnboarding("layout_status", { kind: "button", optionId: "tem_layout" }, {});
    expect(r).toMatchObject({ ok: true, nextStepId: "files_status", handoff: false });
  });

  test("files_status conclui bloco I com handoff=true", () => {
    const r = advanceOnboarding(
      "files_status",
      { kind: "button", optionId: "sim_vetorizado" },
      {},
    );
    expect(r).toMatchObject({ ok: true, nextStepId: "completed", handoff: true });
    if (r.ok) expect(r.answers.filesStatus).toBe("sim_vetorizado");
  });

  test("repeat_layout_check conclui bloco II com handoff=true", () => {
    const r = advanceOnboarding(
      "repeat_layout_check",
      { kind: "button", optionId: "igual" },
      { name: "Maria", isFirstOrder: false },
    );
    expect(r).toMatchObject({ ok: true, nextStepId: "completed", handoff: true });
    if (r.ok) expect(r.answers.repeatLayoutChange).toBe("igual");
  });

  test("completed é terminal — sempre rejeita", () => {
    const r = advanceOnboarding("completed", { kind: "text", text: "qualquer coisa" }, {});
    expect(r.ok).toBe(false);
  });

  test("step de choice rejeita input do tipo text (deve vir resolvido como button)", () => {
    const r = advanceOnboarding("first_order_check", { kind: "text", text: "sim" }, {});
    expect(r.ok).toBe(false);
  });
});
