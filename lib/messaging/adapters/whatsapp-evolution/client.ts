import { mapEvolutionError } from "./error-map";

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function postJson<T = unknown>(
  url: string,
  apiKey: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await safeJson(res);
    throw new Error(mapEvolutionError(res.status, errBody));
  }
  return (await res.json()) as T;
}

export async function getJson<T = unknown>(url: string, apiKey: string): Promise<T> {
  const res = await fetch(url, {
    headers: { apikey: apiKey },
  });
  if (!res.ok) {
    const errBody = await safeJson(res);
    throw new Error(mapEvolutionError(res.status, errBody));
  }
  return (await res.json()) as T;
}
