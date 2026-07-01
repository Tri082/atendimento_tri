"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileTextIcon, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  mediaUrl: string;
  mediaType: string;
  filename?: string;
}

function isStoragePath(url: string): boolean {
  return !url.startsWith("http://") && !url.startsWith("https://");
}

export function MessageMedia({ mediaUrl, mediaType, filename }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(
    isStoragePath(mediaUrl) ? null : mediaUrl,
  );

  useEffect(() => {
    if (!isStoragePath(mediaUrl)) return;
    let cancelled = false;
    const supabase = createClient();
    supabase.storage
      .from("messaging")
      .createSignedUrl(mediaUrl, 3600)
      .then((r) => {
        if (!cancelled && r.data?.signedUrl) setSignedUrl(r.data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaUrl]);

  const isImage = mediaType.startsWith("image/");

  if (!signedUrl) {
    return (
      <div className="flex items-center gap-2 rounded border bg-muted/40 p-2 text-xs text-muted-foreground">
        {isImage ? <ImageIcon className="h-4 w-4" /> : <FileTextIcon className="h-4 w-4" />}
        carregando...
      </div>
    );
  }

  if (isImage) {
    return (
      <a href={signedUrl} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={signedUrl} alt={filename ?? "imagem"} className="max-h-72 rounded-md" />
      </a>
    );
  }

  return (
    <Link
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded border bg-card p-2 text-sm hover:bg-accent/50"
    >
      <FileTextIcon className="h-5 w-5" />
      <span className="truncate">{filename ?? "documento"}</span>
    </Link>
  );
}
