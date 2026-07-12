import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../lib/messaging/adapters/whatsapp-evolution/client", () => ({
  postJson: vi.fn(),
}));

import { evolutionAdapter } from "@/lib/messaging/adapters/whatsapp-evolution/adapter";
import { postJson } from "@/lib/messaging/adapters/whatsapp-evolution/client";

const CFG = {
  baseUrl: "https://evo.example.com",
  apiKey: "key-1234567890",
  instanceName: "inst-1",
  webhookSecret: "secret-webhook-1234",
};

describe("evolutionAdapter.sendButtons", () => {
  beforeEach(() => {
    (postJson as ReturnType<typeof vi.fn>).mockReset();
  });

  test("monta o payload no formato da Evolution API e retorna externalId", async () => {
    (postJson as ReturnType<typeof vi.fn>).mockResolvedValue({ key: { id: "wamid-1" } });

    const result = await evolutionAdapter.sendButtons!(CFG, {
      to: "+5511987654321",
      text: "É o seu primeiro pedido conosco?",
      buttons: [
        { id: "sim", title: "Sim" },
        { id: "nao", title: "Não" },
      ],
    });

    expect(result).toEqual({ externalId: "wamid-1" });
    expect(postJson).toHaveBeenCalledWith(
      "https://evo.example.com/message/sendButtons/inst-1",
      "key-1234567890",
      {
        number: "5511987654321",
        text: "É o seu primeiro pedido conosco?",
        footerText: "",
        buttons: [
          { buttonId: "sim", buttonText: { displayText: "Sim" } },
          { buttonId: "nao", buttonText: { displayText: "Não" } },
        ],
      },
    );
  });
});
