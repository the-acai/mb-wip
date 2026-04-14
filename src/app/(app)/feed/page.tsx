import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getFeedPosts } from "@/lib/queries/posts";
import { getSignedUrls } from "@/lib/queries/storage";
import { FeedClient } from "@/components/feed/feed-client";
import type { FeedPost } from "@/components/feed/experiment-card";

export default async function FeedPage() {
  const supabase = await createClient();
  const queryClient = new QueryClient();

  // Prefetch the default feed (newest)
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["feed", { tag: null }],
    queryFn: async () => {
      const result = await getFeedPosts(supabase, { limit: 20 });
      const posts = result.posts as FeedPost[];

      // Batch-fetch signed URLs for images and video posters
      const pathsToSign: string[] = [];
      for (const p of posts) {
        const firstImage = p.assets?.find((a) =>
          a.mime_type?.startsWith("image/")
        );
        if (firstImage) {
          pathsToSign.push(firstImage.file_path);
        } else {
          const firstVideo = p.assets?.find(
            (a) => a.mime_type?.startsWith("video/") && a.poster_path
          );
          if (firstVideo?.poster_path) {
            pathsToSign.push(firstVideo.poster_path);
          }
        }
      }

      if (pathsToSign.length > 0) {
        try {
          const urlMap = await getSignedUrls(supabase, pathsToSign);
          for (const post of posts) {
            const firstImage = post.assets?.find((a) =>
              a.mime_type?.startsWith("image/")
            );
            if (firstImage && urlMap.has(firstImage.file_path)) {
              firstImage.signed_url = urlMap.get(firstImage.file_path);
              continue;
            }
            const firstVideo = post.assets?.find(
              (a) => a.mime_type?.startsWith("video/") && a.poster_path
            );
            if (
              firstVideo?.poster_path &&
              urlMap.has(firstVideo.poster_path)
            ) {
              firstVideo.poster_signed_url = urlMap.get(
                firstVideo.poster_path
              );
            }
          }
        } catch {
          // Skip if batch fetch fails
        }
      }

      return { posts, nextCursor: result.nextCursor };
    },
    initialPageParam: undefined,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FeedClient />
    </HydrationBoundary>
  );
}
