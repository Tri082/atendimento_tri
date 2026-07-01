import { describe, expect, test } from "vitest";
import {
  extractMessageContent,
  toRemoteTemplate,
} from "@/lib/messaging/adapters/whatsapp-cloud/extract-message";

describe("extractMessageContent", () => {
  test("text", () => {
    expect(extractMessageContent({ type: "text", text: { body: "Olá" } })).toEqual({
      body: "Olá",
    });
  });

  test("image com caption", () => {
    expect(
      extractMessageContent({
        type: "image",
        image: { id: "mid", mime_type: "image/jpeg", caption: "Foto" },
      }),
    ).toEqual({
      body: "Foto",
      media: [{ externalMediaId: "mid", mimeType: "image/jpeg" }],
    });
  });

  test("image sem caption", () => {
    expect(
      extractMessageContent({
        type: "image",
        image: { id: "mid", mime_type: "image/png" },
      }),
    ).toEqual({
      media: [{ externalMediaId: "mid", mimeType: "image/png" }],
    });
  });

  test("document com filename", () => {
    expect(
      extractMessageContent({
        type: "document",
        document: { id: "did", mime_type: "application/pdf", filename: "boleto.pdf" },
      }),
    ).toEqual({
      media: [{ externalMediaId: "did", mimeType: "application/pdf" }],
    });
  });

  test("audio (capturado mesmo fora do escopo de send)", () => {
    expect(
      extractMessageContent({
        type: "audio",
        audio: { id: "aid", mime_type: "audio/ogg" },
      }),
    ).toEqual({
      media: [{ externalMediaId: "aid", mimeType: "audio/ogg" }],
    });
  });

  test("tipo desconhecido retorna body sintético", () => {
    expect(extractMessageContent({ type: "location" })).toEqual({
      body: "[mensagem de tipo location não exibível]",
    });
  });
});

describe("toRemoteTemplate", () => {
  test("template body com {{1}} e {{2}}", () => {
    const meta = {
      id: "t1",
      name: "boas_vindas",
      language: "pt_BR",
      category: "MARKETING",
      status: "APPROVED",
      components: [
        { type: "BODY", text: "Oi {{1}}, seu pedido {{2}} foi enviado." },
      ],
    };
    const r = toRemoteTemplate(meta);
    expect(r.paramCount).toBe(2);
    expect(r.metaId).toBe("t1");
    expect(r.category).toBe("MARKETING");
    expect(r.status).toBe("APPROVED");
  });

  test("template sem variáveis", () => {
    const meta = {
      id: "t2",
      name: "lembrete",
      language: "pt_BR",
      category: "UTILITY",
      status: "APPROVED",
      components: [{ type: "BODY", text: "Olá, lembrete aqui." }],
    };
    expect(toRemoteTemplate(meta).paramCount).toBe(0);
  });

  test("template com header e footer (variáveis só no body contam)", () => {
    const meta = {
      id: "t3",
      name: "x",
      language: "pt_BR",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        { type: "HEADER", text: "Header com {{1}}" },
        { type: "BODY", text: "Body com {{1}}" },
        { type: "FOOTER", text: "Footer" },
      ],
    };
    expect(toRemoteTemplate(meta).paramCount).toBe(1);
  });
});
