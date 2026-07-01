import { tool } from "ai";
import { z } from "zod";
import { logError } from "@/lib/logger";
import type { ToolContext } from "./index";

export function makeListOpenDealsTool(ctx: ToolContext) {
  return tool({
    description:
      "Lista deals abertos (não won/lost) de um contato. Use depois de identificar o contato com find_contact.",
    inputSchema: z.object({
      contactId: z.string().describe("ID do contato no CRM"),
    }),
    execute: async ({ contactId }) => {
      try {
        const { data } = await ctx.supabase
          .from("deal_contacts")
          .select("deal:deals!inner(id, name, stage, value, expected_close_date)")
          .eq("contact_id", contactId)
          .limit(10);

        const deals = (data ?? [])
          .map(
            (l) =>
              l.deal as unknown as {
                id: string;
                name: string;
                stage: string;
                value: number | null;
                expected_close_date: string | null;
              } | null,
          )
          .filter(
            (d): d is NonNullable<typeof d> =>
              d !== null && d.stage !== "won" && d.stage !== "lost",
          );

        return {
          deals: deals.map((d) => ({
            id: d.id,
            name: d.name,
            stage: d.stage,
            value: d.value,
            expected_close_date: d.expected_close_date,
          })),
        };
      } catch (err) {
        logError("tool.list_open_deals", err);
        return { error: "Não consegui buscar deals." };
      }
    },
  });
}
