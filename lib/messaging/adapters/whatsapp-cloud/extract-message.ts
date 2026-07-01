import type { NormalizedMediaAttachment, RemoteTemplate } from "@/lib/messaging/adapter";

interface MetaInboundMessage {
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
  audio?: { id?: string; mime_type?: string };
  video?: { id?: string; mime_type?: string; caption?: string };
  sticker?: { id?: string; mime_type?: string };
}

export function extractMessageContent(m: MetaInboundMessage): {
  body?: string;
  media?: NormalizedMediaAttachment[];
} {
  if (m.type === "text") {
    return { body: m.text?.body };
  }

  const mediaKey = ["image", "document", "audio", "video", "sticker"].find(
    (k) => k === m.type,
  ) as keyof MetaInboundMessage | undefined;

  if (mediaKey) {
    const obj = m[mediaKey] as { id?: string; mime_type?: string; caption?: string } | undefined;
    if (obj?.id && obj.mime_type) {
      const media: NormalizedMediaAttachment[] = [
        { externalMediaId: obj.id, mimeType: obj.mime_type },
      ];
      if (obj.caption) return { body: obj.caption, media };
      return { media };
    }
  }

  return {
    body: `[mensagem de tipo ${m.type ?? "desconhecido"} não exibível]`,
  };
}

interface MetaTemplateRaw {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components?: { type: string; text?: string }[];
}

export function toRemoteTemplate(t: MetaTemplateRaw): RemoteTemplate {
  const body = (t.components ?? []).find((c) => c.type === "BODY");
  const paramCount = body?.text ? countParams(body.text) : 0;

  return {
    metaId: t.id,
    name: t.name,
    language: t.language,
    category: t.category as RemoteTemplate["category"],
    status: t.status as RemoteTemplate["status"],
    components: t.components ?? [],
    paramCount,
  };
}

function countParams(text: string): number {
  const matches = text.match(/\{\{\d+\}\}/g);
  return matches ? new Set(matches).size : 0;
}
