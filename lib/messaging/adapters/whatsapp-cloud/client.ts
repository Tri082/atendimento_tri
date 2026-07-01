import { mapMetaError } from "./error-map";
import type { WhatsappCloudConfig } from "./schema";

export async function graphFetch<T = unknown>(
  cfg: WhatsappCloudConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `https://graph.facebook.com/${cfg.apiVersion}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let errPayload: unknown = null;
    try {
      errPayload = await res.json();
    } catch {
      errPayload = { error: { message: res.statusText, code: res.status } };
    }
    throw mapMetaError(errPayload);
  }

  return (await res.json()) as T;
}

export async function graphFetchBinary(
  cfg: WhatsappCloudConfig,
  url: string,
): Promise<{ data: Buffer; mimeType: string }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
  });
  if (!res.ok) {
    let errPayload: unknown = null;
    try {
      errPayload = await res.json();
    } catch {
      errPayload = { error: { message: res.statusText, code: res.status } };
    }
    throw mapMetaError(errPayload);
  }
  const ab = await res.arrayBuffer();
  return {
    data: Buffer.from(ab),
    mimeType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}
