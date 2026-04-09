"use client";

import { useMemo } from "react";

import { useFeedPosts } from "@/hooks/use-feed-posts";
import { FeedGrid } from "./feed-grid";
import type { FeedPost } from "./experiment-card";

export function FeedClient() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useFeedPosts({ tag: null });

  const posts = useMemo(
    () => (data?.pages.flatMap((page) => page.posts) ?? []) as FeedPost[],
    [data]
  );

  return (
    <FeedGrid
      posts={posts}
      hasMore={hasNextPage}
      loading={isFetchingNextPage || (isFetching && posts.length === 0)}
      onLoadMore={() => fetchNextPage()}
    />
  );
}
