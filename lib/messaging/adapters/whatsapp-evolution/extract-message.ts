export function stripPlus(s: string): string {
  return s.startsWith("+") ? s.slice(1) : s;
}

const JID_SUFFIX_RE = /@(?:s\.whatsapp\.net|lid|g\.us|broadcast)$/;

export function jidToPhone(jid: string): string {
  const cleaned = jid.replace(JID_SUFFIX_RE, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

export function mimeToMediaType(mime: string): "image" | "video" | "audio" | "document" {
  if (!mime) return "document";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

export function extractFilename(url: string): string | null {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop();
    if (!last) return null;
    return decodeURIComponent(last);
  } catch {
    return null;
  }
}

export function isoFromUnixSeconds(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}
