import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/messaging/webhooks", () => ({ processWebhook: vi.fn() }));
vi.mock("next/server", () => ({
  after: (fn: () => unknown) => Promise.resolve(fn()),
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      }),
  },
}));

import { processWebhook } from "@/lib/messaging/webhooks";
import "@/lib/messaging"; // garante registry inicializado
import { POST } from "@/app/api/webhooks/messaging/[provider]/route";

const mockedProcess = processWebhook as unknown as ReturnType<typeof vi.fn>;

function makeReq(body: string, headers: Record<string, string> = {}) {
  return {
    text: async () => body,
    headers: {
      get: (k: string) => headers[k.toLowerCase()] ?? null,
      forEach: (cb: (v: string, k: string) => void) => {
        for (const [k, v] of Object.entries(headers)) cb(v, k);
      },
    },
    url: "https://x.local/api/webhooks/messaging/mock",
  } as unknown as Request;
}

describe("webhook POST handler", () => {
  beforeEach(() => mockedProcess.mockReset());

  test("400 se provider desconhecido", async () => {
    const res = await POST(makeReq("{}"), { params: Promise.resolve({ provider: "nao-existe" }) });
    expect(res.status).toBe(400);
  });

  test("200 e despacha processWebhook em mock (verifyWebhook sempre true)", async () => {
    mockedProcess.mockResolvedValue(undefined);
    const res = await POST(makeReq(JSON.stringify({ events: [] })), {
      params: Promise.resolve({ provider: "mock" }),
    });
    expect(res.status).toBe(200);
    expect(mockedProcess).toHaveBeenCalled();
  });

  test("401 quando adapter recusa assinatura (whatsapp_cloud stub no foundation)", async () => {
    const res = await POST(makeReq("{}"), {
      params: Promise.resolve({ provider: "whatsapp_cloud" }),
    });
    expect(res.status).toBe(401);
    expect(mockedProcess).not.toHaveBeenCalled();
  });
});

describe("webhook GET handler (Meta verification handshake)", () => {
  test("mock: echo do hub.challenge sem verificação", async () => {
    const { GET } = await import("@/app/api/webhooks/messaging/[provider]/route");
    const url = "https://x.local/api/webhooks/messaging/mock?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=anything";
    const res = await GET(
      { url } as unknown as Request,
      { params: Promise.resolve({ provider: "mock" }) },
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("abc");
  });

  test("whatsapp_cloud: 401 se verifyToken não bate", async () => {
    // Stub do createServiceClient pra simular zero canais com esse verify_token.
    // (Handler usa service client porque webhook não tem cookie de sessão.)
    vi.doMock("@/lib/supabase/service", () => ({
      createServiceClient: vi.fn(() => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              filter: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            }),
          }),
        }),
      })),
    }));
    vi.resetModules();

    const { GET } = await import("@/app/api/webhooks/messaging/[provider]/route");
    const url = "https://x.local/api/webhooks/messaging/whatsapp_cloud?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=wrong";
    const res = await GET(
      { url } as unknown as Request,
      { params: Promise.resolve({ provider: "whatsapp_cloud" }) },
    );
    expect(res.status).toBe(401);

    vi.doUnmock("@/lib/supabase/service");
  });
});
