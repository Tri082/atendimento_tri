"use client";

import { useState } from "react";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { syncTemplatesAction } from "@/lib/messaging/templates/actions";

export function SyncButton({ orgSlug, channelId }: { orgSlug: string; channelId: string }) {
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncing(true);
    const r = await syncTemplatesAction({ orgSlug, channelId });
    setSyncing(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(
      `${r.data?.synced ?? 0} templates sincronizados; ${r.data?.removed ?? 0} removidos.`,
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
      {syncing ? (
        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RefreshCwIcon className="mr-2 h-4 w-4" />
      )}
      Sincronizar templates
    </Button>
  );
}
