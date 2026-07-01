import { createClient } from "@/lib/supabase/server";

const LOGO_URL_TTL_SECONDS = 60 * 60; // 1h
const CACHE_TTL_MS = 50 * 60 * 1000; // 50min — menor que TTL da signed URL

/**
 * NEW-HIGH-8 + R3-STO-001: bucket org-logos é privado. `organizations.logo_url`
 * armazena apenas o storage path; signed URL gerado on-the-fly e cacheado em
 * memória de processo. Cache invalida automaticamente pelo path: upload novo
 * cria UUID novo → key cache diferente.
 */
const cache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_HARD_CAP = 5000;

function cacheGet(key: string, now: number): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (now > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.url;
}

function cachePut(key: string, url: string, now: number): void {
  if (cache.size >= CACHE_HARD_CAP) {
    // sweep simples: remove ~10% expirados ou aleatórios
    let removed = 0;
    for (const [k, v] of cache) {
      if (now > v.expiresAt || removed < CACHE_HARD_CAP / 10) {
        cache.delete(k);
        removed++;
        if (removed >= CACHE_HARD_CAP / 5) break;
      }
    }
  }
  cache.set(key, { url, expiresAt: now + CACHE_TTL_MS });
}

export async function resolveOrgLogoUrl(stored: string | null): Promise<string | null> {
  if (!stored) return null;
  // Compat com dados antigos (URL pública completa)
  if (stored.startsWith("http://") || stored.startsWith("https://")) {
    return stored;
  }
  const now = Date.now();
  const cached = cacheGet(stored, now);
  if (cached) return cached;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("org-logos")
    .createSignedUrl(stored, LOGO_URL_TTL_SECONDS);
  if (error || !data) return null;
  cachePut(stored, data.signedUrl, now);
  return data.signedUrl;
}
