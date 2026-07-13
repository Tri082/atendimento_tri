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

describe("evolutionAdapter.markAsRead", () => {
  beforeEach(() => {
    (postJson as ReturnType<typeof vi.fn>).mockReset();
  });

  test("monta o payload no formato da Evolution API com o JID completo", async () => {
    (postJson as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await evolutionAdapter.markAsRead!(CFG, {
      to: "+5511987654321",
      externalMessageId: "wamid-1",
    });

    expect(postJson).toHaveBeenCalledWith(
      "https://evo.example.com/chat/markMessageAsRead/inst-1",
      "key-1234567890",
      {
        readMessages: [
          { remoteJid: "5511987654321@s.whatsapp.net", fromMe: false, id: "wamid-1" },
        ],
      },
    );
  });
});
