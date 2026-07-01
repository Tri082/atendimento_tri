import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

interface Props {
  orgSlug: string;
  contactId: string;
}

export async function RelatedTasks({ orgSlug, contactId }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, status, due_date")
    .eq("contact_id", contactId)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(5);

  const tasks = data ?? [];

  return (
    <div className="px-4 pb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label-mono text-[10px]">/ tarefas pendentes ({tasks.length})</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente.</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link
                href={`/app/${orgSlug}/tarefas/${t.id}`}
                className="block rounded p-2 text-sm hover:bg-accent/50"
              >
                {t.title}
                {t.due_date && (
                  <span className="ml-1 text-[10px] text-muted-foreground">· {t.due_date}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full"
        render={<Link href={`/app/${orgSlug}/tarefas`} />}
        nativeButton={false}
      >
        + Criar tarefa
      </Button>
    </div>
  );
}
