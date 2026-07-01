import { requireOrgRole } from "@/lib/auth/guards";
import { listPendingSuggestions, listTagsWithUsage } from "@/lib/tags/queries";
import { TagSuggestionsSection } from "./tag-suggestions-section";
import { TagsTable } from "./tags-table";

export const metadata = { title: "Tags" };

type Props = { params: Promise<{ orgSlug: string }> };

export default async function TagsPage({ params }: Props) {
  const { orgSlug } = await params;
  const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });

  const [tags, suggestions] = await Promise.all([
    listTagsWithUsage(org.id),
    listPendingSuggestions(org.id),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <span className="label-mono">/ tags</span>
        <h1 className="font-semibold text-3xl tracking-tight">Tags</h1>
        <p className="text-muted-foreground text-sm">
          Catálogo único. Use pra segmentar contatos, empresas, deals e rotular conversas.
        </p>
      </div>

      <TagsTable orgSlug={orgSlug} tags={tags} />

      {suggestions.length > 0 && (
        <TagSuggestionsSection orgSlug={orgSlug} suggestions={suggestions} />
      )}
    </div>
  );
}
