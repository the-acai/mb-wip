import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getFeedPosts } from "@/lib/queries/posts";
import { getAllTags } from "@/lib/queries/tags";
import { getSignedUrls } from "@/lib/queries/storage";
import { FeedClient } from "@/components/feed/feed-client";
import type { FeedPost } from "@/components/feed/experiment-card";

export default async function FeedPage() {
  const supabase = await createClient();
  const queryClient = new QueryClient();

  const tags = (await getAllTags(supabase)) ?? [];

  // Prefetch the default feed (newest, no tag filter)
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["feed", { tag: null }],
    queryFn: async () => {
      const result = await getFeedPosts(supabase, { limit: 20 });
      const posts = result.posts as FeedPost[];

      // Batch-fetch signed URLs
      const imagePaths = posts
        .map(
          (p) =>
            p.assets?.find((a) => a.mime_type?.startsWith("image/"))?.file_path
        )
        .filter((p): p is string => !!p);

      if (imagePaths.length > 0) {
        try {
          const urlMap = await getSignedUrls(supabase, imagePaths);
          for (const post of posts) {
            const firstImage = post.assets?.find((a) =>
              a.mime_type?.startsWith("image/")
            );
            if (firstImage && urlMap.has(firstImage.file_path)) {
              firstImage.signed_url = urlMap.get(firstImage.file_path);
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
      <FeedClient tags={tags} />
    </HydrationBoundary>
  );
}
