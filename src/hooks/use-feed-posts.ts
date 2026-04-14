"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  getFeedPosts,
  type FeedCursor,
  type FeedPageResult,
} from "@/lib/queries/posts";
import { getSignedUrls } from "@/lib/queries/storage";
import { getCachedUrl, setCachedUrls } from "@/lib/signed-url-cache";
import type { FeedPost } from "@/components/feed/experiment-card";

interface UseFeedPostsOptions {
  tag?: string | null;
}

async function fetchFeedPage({
  pageParam,
  tag,
}: {
  pageParam: FeedCursor | undefined;
  tag?: string | null;
}): Promise<FeedPageResult & { posts: FeedPost[] }> {
  const supabase = createClient();
  const result = await getFeedPosts(supabase, {
    tag: tag ?? undefined,
    cursor: pageParam,
    limit: 20,
  });

  const posts = result.posts as FeedPost[];

  // Batch-fetch signed URLs for images and video posters, using cache where possible
  const uncachedPaths: string[] = [];
  for (const post of posts) {
    // Prefer images; fall back to a video's poster for display
    const firstImage = post.assets?.find((a) =>
      a.mime_type?.startsWith("image/")
    );
    if (firstImage) {
      const cached = getCachedUrl(firstImage.file_path);
      if (cached) {
        firstImage.signed_url = cached;
      } else {
        uncachedPaths.push(firstImage.file_path);
      }
      continue;
    }

    // No image — try to find a video with a poster
    const firstVideo = post.assets?.find(
      (a) => a.mime_type?.startsWith("video/") && a.poster_path
    );
    if (firstVideo?.poster_path) {
      const cached = getCachedUrl(firstVideo.poster_path);
      if (cached) {
        firstVideo.poster_signed_url = cached;
      } else {
        uncachedPaths.push(firstVideo.poster_path);
      }
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
        if (firstImage && !firstImage.signed_url && urlMap.has(firstImage.file_path)) {
          firstImage.signed_url = urlMap.get(firstImage.file_path);
          continue;
        }

        const firstVideo = post.assets?.find(
          (a) => a.mime_type?.startsWith("video/") && a.poster_path
        );
        if (
          firstVideo?.poster_path &&
          !firstVideo.poster_signed_url &&
          urlMap.has(firstVideo.poster_path)
        ) {
          firstVideo.poster_signed_url = urlMap.get(firstVideo.poster_path);
        }
      }
    } catch {
      // Skip if batch fetch fails
    }
  }

  return { posts, nextCursor: result.nextCursor };
}

export function useFeedPosts({ tag }: UseFeedPostsOptions) {
  return useInfiniteQuery({
    queryKey: ["feed", { tag: tag ?? null }],
    queryFn: ({ pageParam }) => fetchFeedPage({ pageParam, tag }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as FeedCursor | undefined,
  });
}
