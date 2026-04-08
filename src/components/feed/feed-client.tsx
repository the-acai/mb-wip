"use client";

import { useState, useCallback, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";
import { getFeedPosts } from "@/lib/queries/posts";
import { getSignedUrl } from "@/lib/queries/storage";
import { TagFilterBar } from "./tag-filter-bar";
import { FeedGrid } from "./feed-grid";
import type { FeedPost } from "./experiment-card";

interface Tag {
  id: string;
  name: string;
}

interface FeedClientProps {
  initialPosts: FeedPost[];
  tags: Tag[];
  initialHasMore: boolean;
}

export function FeedClient({
  initialPosts,
  tags,
  initialHasMore,
}: FeedClientProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  const loadMore = useCallback(() => {
    if (isPending) return;

    startTransition(async () => {
      const supabase = createClient();
      const lastPost = posts[posts.length - 1];
      if (!lastPost) return;

      const newPosts = await getFeedPosts(supabase, {
        tag: activeTag ?? undefined,
        cursor: lastPost.created_at,
        limit: 20,
      });

      // Get signed URLs for thumbnails
      const postsWithUrls = await Promise.all(
        (newPosts as FeedPost[]).map(async (post) => {
          const firstImage = post.assets?.find((a) =>
            a.mime_type?.startsWith("image/")
          );
          if (firstImage && !firstImage.signed_url) {
            try {
              firstImage.signed_url = await getSignedUrl(
                supabase,
                firstImage.file_path
              );
            } catch {
              // Skip if URL generation fails
            }
          }
          return post;
        })
      );

      if (postsWithUrls.length < 20) {
        setHasMore(false);
      }

      setPosts((prev) => [...prev, ...postsWithUrls]);
    });
  }, [isPending, posts, activeTag]);

  const handleTagChange = useCallback(
    (tag: string | null) => {
      setActiveTag(tag);
      setHasMore(true);

      startTransition(async () => {
        const supabase = createClient();
        const newPosts = await getFeedPosts(supabase, {
          tag: tag ?? undefined,
          limit: 20,
        });

        const postsWithUrls = await Promise.all(
          (newPosts as FeedPost[]).map(async (post) => {
            const firstImage = post.assets?.find((a) =>
              a.mime_type?.startsWith("image/")
            );
            if (firstImage && !firstImage.signed_url) {
              try {
                firstImage.signed_url = await getSignedUrl(
                  supabase,
                  firstImage.file_path
                );
              } catch {
                // Skip if URL generation fails
              }
            }
            return post;
          })
        );

        if (postsWithUrls.length < 20) {
          setHasMore(false);
        }

        setPosts(postsWithUrls);
      });
    },
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <TagFilterBar
        tags={tags}
        activeTag={activeTag}
        onTagChange={handleTagChange}
      />
      <FeedGrid
        posts={posts}
        hasMore={hasMore}
        loading={isPending}
        onLoadMore={loadMore}
      />
    </div>
  );
}
