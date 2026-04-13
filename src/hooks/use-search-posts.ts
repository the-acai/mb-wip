"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { searchPosts } from "@/lib/queries/posts";
import { getSignedUrls } from "@/lib/queries/storage";
import { getCachedUrl, setCachedUrls } from "@/lib/signed-url-cache";
import type { FeedPost } from "@/components/feed/experiment-card";

/**
 * Search posts by free-text query. Single-page result for now (palette UX
 * doesn't need infinite scroll). Reuses the signed-URL cache so repeat
 * searches don't re-fetch storage URLs for the same assets.
 */
export function useSearchPosts(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", trimmed],
    enabled: trimmed.length > 0,
    queryFn: async () => {
      const supabase = createClient();
      const { posts } = await searchPosts(supabase, { query: trimmed, limit: 20 });
      const typed = posts as FeedPost[];

      // Resolve signed URLs (cached when possible — same pattern as feed)
      const uncached: string[] = [];
      for (const post of typed) {
        const firstImage = post.assets?.find((a) =>
          a.mime_type?.startsWith("image/")
        );
        if (!firstImage) continue;
        const cached = getCachedUrl(firstImage.file_path);
        if (cached) {
          firstImage.signed_url = cached;
        } else {
          uncached.push(firstImage.file_path);
        }
      }
      if (uncached.length > 0) {
        try {
          const urlMap = await getSignedUrls(supabase, uncached);
          setCachedUrls(urlMap);
          for (const post of typed) {
            const firstImage = post.assets?.find((a) =>
              a.mime_type?.startsWith("image/")
            );
            if (firstImage && !firstImage.signed_url && urlMap.has(firstImage.file_path)) {
              firstImage.signed_url = urlMap.get(firstImage.file_path);
            }
          }
        } catch {
          // best-effort
        }
      }

      return typed;
    },
    // Search results are reasonably stable; keep them around briefly so the
    // user can re-open the palette and see their last query.
    staleTime: 30_000,
  });
}
