import { recoverStaleMessages } from "@/lib/messaging/recovery";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await recoverStaleMessages();
  return Response.json(result);
}
