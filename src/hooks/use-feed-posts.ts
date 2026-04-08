"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  getFeedPosts,
  type SortMode,
  type FeedCursor,
  type FeedPageResult,
} from "@/lib/queries/posts";
import { getSignedUrls } from "@/lib/queries/storage";
import { getCachedUrl, setCachedUrls } from "@/lib/signed-url-cache";
import type { FeedPost } from "@/components/feed/experiment-card";

interface UseFeedPostsOptions {
  tag?: string | null;
  sort: SortMode;
}

async function fetchFeedPage({
  pageParam,
  tag,
  sort,
}: {
  pageParam: FeedCursor | undefined;
  tag?: string | null;
  sort: SortMode;
}): Promise<FeedPageResult & { posts: FeedPost[] }> {
  const supabase = createClient();
  const result = await getFeedPosts(supabase, {
    tag: tag ?? undefined,
    cursor: pageParam,
    limit: 20,
    sort,
  });

  const posts = result.posts as FeedPost[];

  // Batch-fetch signed URLs, using cache where possible
  const uncachedPaths: string[] = [];
  for (const post of posts) {
    const firstImage = post.assets?.find((a) =>
      a.mime_type?.startsWith("image/")
    );
    if (!firstImage) continue;
    const cached = getCachedUrl(firstImage.file_path);
    if (cached) {
      firstImage.signed_url = cached;
    } else {
      uncachedPaths.push(firstImage.file_path);
    }
  }

  if (uncachedPaths.length > 0) {
    try {
      const urlMap = await getSignedUrls(supabase, uncachedPaths);
      setCachedUrls(urlMap);
      for (const post of posts) {
        const firstImage = post.assets?.find((a) =>
          a.mime_type?.startsWith("image/")
        );
        if (
          firstImage &&
          !firstImage.signed_url &&
          urlMap.has(firstImage.file_path)
        ) {
          firstImage.signed_url = urlMap.get(firstImage.file_path);
        }
      }
    } catch {
      // Skip if batch fetch fails
    }
  }

  return { posts, nextCursor: result.nextCursor };
}

export function useFeedPosts({ tag, sort }: UseFeedPostsOptions) {
  return useInfiniteQuery({
    queryKey: ["feed", { tag: tag ?? null, sort }],
    queryFn: ({ pageParam }) => fetchFeedPage({ pageParam, tag, sort }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as FeedCursor | undefined,
  });
}
