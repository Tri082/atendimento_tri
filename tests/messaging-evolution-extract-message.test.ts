import { describe, expect, test } from "vitest";
import {
  extractFilename,
  isoFromUnixSeconds,
  jidToPhone,
  mimeToMediaType,
  stripPlus,
} from "@/lib/messaging/adapters/whatsapp-evolution/extract-message";

describe("stripPlus", () => {
  test("remove + do início", () => {
    expect(stripPlus("+5511999990000")).toBe("5511999990000");
  });
  test("sem + não muda", () => {
    expect(stripPlus("5511999990000")).toBe("5511999990000");
  });
  test("string vazia retorna vazia", () => {
    expect(stripPlus("")).toBe("");
  });
});

describe("jidToPhone", () => {
  test("remove sufixo @s.whatsapp.net e prefixa +", () => {
    expect(jidToPhone("5511999990000@s.whatsapp.net")).toBe("+5511999990000");
  });
  test("remove sufixo @lid (alternativo)", () => {
    expect(jidToPhone("5511999990000@lid")).toBe("+5511999990000");
  });
  test("JID sem sufixo só adiciona +", () => {
    expect(jidToPhone("5511999990000")).toBe("+5511999990000");
  });
  test("JID com + duplicado não duplica", () => {
    expect(jidToPhone("+5511999990000@s.whatsapp.net")).toBe("+5511999990000");
  });
});

describe("mimeToMediaType", () => {
  test("image/* → image", () => {
    expect(mimeToMediaType("image/jpeg")).toBe("image");
    expect(mimeToMediaType("image/png")).toBe("image");
  });
  test("video/* → video", () => {
    expect(mimeToMediaType("video/mp4")).toBe("video");
  });
  test("audio/* → audio", () => {
    expect(mimeToMediaType("audio/ogg")).toBe("audio");
  });
  test("application/pdf e outros → document", () => {
    expect(mimeToMediaType("application/pdf")).toBe("document");
    expect(mimeToMediaType("text/plain")).toBe("document");
  });
  test("undefined ou string vazia → document", () => {
    expect(mimeToMediaType("")).toBe("document");
  });
});

describe("extractFilename", () => {
  test("extrai filename de URL com path", () => {
    expect(extractFilename("https://exemplo.com/files/manual.pdf")).toBe("manual.pdf");
  });
  test("decoda URI components", () => {
    expect(extractFilename("https://exemplo.com/files/contrato%20final.pdf")).toBe("contrato final.pdf");
  });
  test("URL sem filename retorna null", () => {
    expect(extractFilename("https://exemplo.com/")).toBe(null);
  });
  test("URL inválida retorna null", () => {
    expect(extractFilename("não é url")).toBe(null);
  });
});

describe("isoFromUnixSeconds", () => {
  test("converte unix seconds em ISO", () => {
    // 1717440000 unix seconds = 2024-06-03T18:40:00.000Z (plan data was off by 80min)
    expect(isoFromUnixSeconds(1717440000)).toBe("2024-06-03T18:40:00.000Z");
  });
  test("número 0 → epoch", () => {
    expect(isoFromUnixSeconds(0)).toBe("1970-01-01T00:00:00.000Z");
  });
});
