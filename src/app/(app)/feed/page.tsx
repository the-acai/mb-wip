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

      // Batch-fetch signed URLs for images, videos, and video posters
      const pathsToSign: string[] = [];
      for (const p of posts) {
        const firstImage = p.assets?.find((a) =>
          a.mime_type?.startsWith("image/")
        );
        if (firstImage) pathsToSign.push(firstImage.file_path);

        const firstVideo = p.assets?.find((a) =>
          a.mime_type?.startsWith("video/")
        );
        if (firstVideo) {
          pathsToSign.push(firstVideo.file_path);
          if (firstVideo.poster_path) pathsToSign.push(firstVideo.poster_path);
        }
      }

      if (pathsToSign.length > 0) {
        try {
          const urlMap = await getSignedUrls(supabase, pathsToSign);
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
    },
    initialPageParam: undefined,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FeedClient />
    </HydrationBoundary>
  );
}
