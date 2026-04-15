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

  // Batch-fetch signed URLs for images, videos, and video posters
  const uncachedPaths: string[] = [];
  for (const post of posts) {
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
    }

    // Always resolve video + poster URLs (for autoplay in feed and overlay)
    const firstVideo = post.assets?.find((a) =>
      a.mime_type?.startsWith("video/")
    );
    if (firstVideo) {
      const cachedVideo = getCachedUrl(firstVideo.file_path);
      if (cachedVideo) {
        firstVideo.signed_url = cachedVideo;
      } else {
        uncachedPaths.push(firstVideo.file_path);
      }
      if (firstVideo.poster_path) {
        const cachedPoster = getCachedUrl(firstVideo.poster_path);
        if (cachedPoster) {
          firstVideo.poster_signed_url = cachedPoster;
        } else {
          uncachedPaths.push(firstVideo.poster_path);
        }
      }
    }
  }

  if (uncachedPaths.length > 0) {
    try {
      const urlMap = await getSignedUrls(supabase, uncachedPaths);
      setCachedUrls(urlMap);
      for (const post of posts) {
        for (const asset of post.assets ?? []) {
          if (!asset.signed_url && urlMap.has(asset.file_path)) {
            asset.signed_url = urlMap.get(asset.file_path);
          }
          if (asset.poster_path && !asset.poster_signed_url && urlMap.has(asset.poster_path)) {
            asset.poster_signed_url = urlMap.get(asset.poster_path);
          }
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
