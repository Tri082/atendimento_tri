"use client";

import { MessageSquareIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <MessageSquareIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Sua caixa de entrada está vazia</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Conecte um canal de WhatsApp, Telegram ou Instagram pra começar a conversar com seus
          contatos direto daqui.
        </p>
        <div className="mt-6">
          <Button
            render={<Link href={`/app/${orgSlug}/settings/channels`} />}
            nativeButton={false}
          >
            Conectar canal
          </Button>
        </div>
      </div>
    </div>
  );
}
