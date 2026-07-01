import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

interface Props {
  orgSlug: string;
  contactId: string;
}

export async function RelatedDeals({ orgSlug, contactId }: Props) {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("deal_contacts")
    .select("deal:deals!inner(id, name, stage, value, expected_close_date)")
    .eq("contact_id", contactId)
    .limit(5);

  const deals = (links ?? [])
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
    .filter((d): d is NonNullable<typeof d> => d !== null && d.stage !== "won" && d.stage !== "lost");

  return (
    <div className="px-4 pb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label-mono text-[10px]">/ deals abertos ({deals.length})</span>
      </div>
      {deals.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum deal aberto.</p>
      ) : (
        <ul className="space-y-1">
          {deals.map((d) => (
            <li key={d.id}>
              <Link
                href={`/app/${orgSlug}/deals/${d.id}`}
                className="block rounded p-2 hover:bg-accent/50"
              >
                <div className="text-sm font-medium">{d.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {d.stage}
                  {d.value ? ` · R$ ${d.value}` : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full"
        render={<Link href={`/app/${orgSlug}/deals`} />}
        nativeButton={false}
      >
        + Criar deal
      </Button>
    </div>
  );
}
