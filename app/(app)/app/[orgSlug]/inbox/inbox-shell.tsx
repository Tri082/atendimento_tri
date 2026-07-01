"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  orgId: string;
  currentConversationId: string | null;
  children: React.ReactNode;
}

// Toggle via ?debug=1 na URL. Quando true, loga eventos do Realtime
// no console pra diagnóstico. Custo: nenhum em prod sem o flag.
function isDebug(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
}

export function InboxShell({ orgId, children }: Props) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function debouncedRefresh() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 500);
  }

  useEffect(() => {
    const debug = isDebug();
    const supabase = createClient();
    const log = (...args: unknown[]) => {
      if (debug) console.log("[inbox-realtime]", ...args);
    };
    const topic = `inbox:${orgId}`;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // Channel privado exige JWT no client do Realtime. `createBrowserClient`
    // não propaga session pro Realtime sozinho — precisa setAuth explícito,
    // senão a policy em `realtime.messages` rejeita (sem auth.uid()).
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        log("no session, skipping realtime subscribe");
        return;
      }
      await supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;

      log("subscribing private broadcast", topic);
      // Trigger SQL `messaging_broadcast` dispara `event=change` em todo
      // INSERT/UPDATE/DELETE de conversations/messages/conversation_tag_links.
      channel = supabase
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "change" }, ({ payload }) => {
          log(payload);
          debouncedRefresh();
        })
        .subscribe((status, err) => {
          log("subscribe status", status, err);
        });
    })();

    return () => {
      log("cleanup");
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [orgId]);

  return <>{children}</>;
}
