import { createFromTemplateAction } from "@/lib/automations/actions.server";
import type { AutomationTemplate } from "@/lib/automations/templates";
import { SubmitTemplateButton } from "./submit-template-button";

export function TemplateCard({
  orgSlug,
  template,
}: {
  orgSlug: string;
  template: AutomationTemplate;
}) {
  const action = createFromTemplateAction.bind(null, {
    orgSlug,
    templateId: template.id,
  });
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none">{template.emoji}</span>
        <div className="flex-1">
          <div className="font-medium text-sm">{template.name}</div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{template.description}</p>
        </div>
      </div>
      <form action={action} className="mt-4 flex justify-end">
        <SubmitTemplateButton />
      </form>
    </div>
  );
}
