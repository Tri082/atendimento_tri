"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  removeTagFromCompanyAction,
  removeTagFromContactAction,
  removeTagFromConversationAction,
  removeTagFromDealAction,
} from "@/lib/tags/apply";
import type { TagScope } from "@/lib/tags/schemas";
import { TagChip } from "./tag-chip";

type Props = {
  orgSlug: string;
  entityType: TagScope;
  entityId: string;
  tagId: string;
  name: string;
  color: string;
  appliedByKind: "human" | "bot" | "automation";
};

export function RemoveTagButton({
  orgSlug,
  entityType,
  entityId,
  tagId,
  name,
  color,
  appliedByKind,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      const input = { orgSlug, tagId, entityId };
      const result =
        entityType === "conversation"
          ? await removeTagFromConversationAction(input)
          : entityType === "contact"
            ? await removeTagFromContactAction(input)
            : entityType === "company"
              ? await removeTagFromCompanyAction(input)
              : await removeTagFromDealAction(input);
      if (!result.ok) toast.error(result.error);
    });
  };

  return (
    <span className={isPending ? "opacity-50" : undefined}>
      <TagChip
        name={name}
        color={color}
        appliedByKind={appliedByKind}
        onRemove={handleRemove}
      />
    </span>
  );
}
