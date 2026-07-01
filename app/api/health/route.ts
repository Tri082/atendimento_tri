/**
 * L-9: endpoint dedicado para healthcheck (orchestrators tipo EasyPanel/K8s).
 * Não renderiza RSC, não toca DB. Resposta constante.
 */
export const runtime = "nodejs";

export async function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain", "cache-control": "no-store" },
  });
}
