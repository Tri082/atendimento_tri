import {
  listTags,
  listTagsOnCompany,
  listTagsOnContact,
  listTagsOnConversation,
  listTagsOnDeal,
} from "@/lib/tags/queries";
import type { TagScope } from "@/lib/tags/schemas";
import { RemoveTagButton } from "./remove-tag-button";
import { TagPicker } from "./tag-picker";

type Props = {
  orgId: string;
  orgSlug: string;
  entityType: TagScope;
  entityId: string;
  conversationContactId?: string | null;
  conversationContactName?: string | null;
};

export async function TagsSection({
  orgId,
  orgSlug,
  entityType,
  entityId,
  conversationContactId,
  conversationContactName,
}: Props) {
  const [available, applied] = await Promise.all([
    listTags(orgId, entityType),
    entityType === "conversation"
      ? listTagsOnConversation(orgId, entityId)
      : entityType === "contact"
        ? listTagsOnContact(orgId, entityId)
        : entityType === "company"
          ? listTagsOnCompany(orgId, entityId)
          : listTagsOnDeal(orgId, entityId),
  ]);

  const appliedTagIds = new Set(applied.map((t) => t.tagId));
  const pickable = available.filter((t) => !appliedTagIds.has(t.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-mono text-[10px]">/ tags</span>
        <TagPicker
          orgSlug={orgSlug}
          entityType={entityType}
          entityId={entityId}
          availableTags={pickable}
          conversationContactId={conversationContactId}
          conversationContactName={conversationContactName}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {applied.length === 0 ? (
          <span className="text-muted-foreground text-xs">Sem tags.</span>
        ) : (
          applied.map((tag) => (
            <RemoveTagButton
              key={tag.tagId}
              orgSlug={orgSlug}
              entityType={entityType}
              entityId={entityId}
              tagId={tag.tagId}
              name={tag.name}
              color={tag.color}
              appliedByKind={tag.appliedByKind}
            />
          ))
        )}
      </div>
    </div>
  );
}
