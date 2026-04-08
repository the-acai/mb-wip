import { createClient } from "@/lib/supabase/server";
import { getFeedPosts } from "@/lib/queries/posts";
import { getAllTags } from "@/lib/queries/tags";
import { getSignedUrl } from "@/lib/queries/storage";
import { FeedClient } from "@/components/feed/feed-client";
import type { FeedPost } from "@/components/feed/experiment-card";

export default async function FeedPage() {
  const supabase = await createClient();

  const [rawPosts, tags] = await Promise.all([
    getFeedPosts(supabase, { limit: 20 }),
    getAllTags(supabase),
  ]);

  // Batch-fetch signed URLs for the first image asset of each post
  const posts: FeedPost[] = await Promise.all(
    (rawPosts as FeedPost[]).map(async (post) => {
      const firstImage = post.assets?.find((a) =>
        a.mime_type?.startsWith("image/")
      );
      if (firstImage) {
        try {
          firstImage.signed_url = await getSignedUrl(
            supabase,
            firstImage.file_path
          );
        } catch {
          // If signed URL generation fails, skip the thumbnail
        }
      }
      return post;
    })
  );

  const hasMore = posts.length >= 20;

  return (
    <FeedClient
      initialPosts={posts}
      tags={tags ?? []}
      initialHasMore={hasMore}
    />
  );
}
