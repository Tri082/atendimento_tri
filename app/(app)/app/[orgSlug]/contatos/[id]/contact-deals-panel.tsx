import Link from "next/link";
import type { ContactDeal } from "@/lib/contacts/queries";
import { STAGE_LABELS } from "@/lib/deals/stages";

type Props = { orgSlug: string; deals: ContactDeal[] };

function formatBrl(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export function ContactDealsPanel({ orgSlug, deals }: Props) {
  if (deals.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Esse contato ainda não está vinculado a nenhum deal.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {deals.map((d) => (
        <li
          key={d.id}
          className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
        >
          <div className="min-w-0">
            <Link
              href={`/app/${orgSlug}/deals/${d.id}`}
              className="truncate font-medium text-sm hover:underline"
            >
              {d.name}
            </Link>
            <p className="text-muted-foreground text-xs">
              {STAGE_LABELS[d.stage]} · {formatBrl(d.value)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
