/**
 * Client-side cache for Supabase signed URLs.
 * Avoids re-fetching URLs for posts the user has already seen
 * (e.g., scrolling back up with virtualization, or overlapping
 * posts when switching sort modes).
 */

const BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedUrl(filePath: string): string | null {
  const entry = cache.get(filePath);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt - BUFFER_MS) {
    cache.delete(filePath);
    return null;
  }
  return entry.url;
}

export function setCachedUrl(filePath: string, url: string, ttlMs = 3600_000) {
  cache.set(filePath, {
    url,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Given a Map of filePath -> signedUrl from a batch fetch,
 * store all entries in the cache.
 */
export function setCachedUrls(urlMap: Map<string, string>, ttlMs = 3600_000) {
  const expiresAt = Date.now() + ttlMs;
  for (const [filePath, url] of urlMap) {
    cache.set(filePath, { url, expiresAt });
  }
}
