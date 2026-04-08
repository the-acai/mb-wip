"use client";

import { useState, useMemo } from "react";

import { useFeedPosts } from "@/hooks/use-feed-posts";
import { TagFilterBar } from "./tag-filter-bar";
import { FeedGrid } from "./feed-grid";
import type { FeedPost } from "./experiment-card";

interface Tag {
  id: string;
  name: string;
}

interface FeedClientProps {
  tags: Tag[];
}

export function FeedClient({ tags }: FeedClientProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useFeedPosts({ tag: activeTag });

  const posts = useMemo(
    () => (data?.pages.flatMap((page) => page.posts) ?? []) as FeedPost[],
    [data]
  );

  return (
    <div className="flex flex-col gap-6">
      <TagFilterBar
        tags={tags}
        activeTag={activeTag}
        onTagChange={setActiveTag}
      />
      <FeedGrid
        posts={posts}
        hasMore={hasNextPage}
        loading={isFetchingNextPage || (isFetching && posts.length === 0)}
        onLoadMore={() => fetchNextPage()}
      />
    </div>
  );
}
