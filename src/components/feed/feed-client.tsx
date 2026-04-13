"use client";

import { useMemo, useState, useEffect } from "react";

import { useFeedPosts } from "@/hooks/use-feed-posts";
import { FeedGrid } from "./feed-grid";
import { LoopScrollContainer } from "./loop-scroll-container";
import type { FeedPost } from "./experiment-card";
import { Button } from "@/components/ui/button";

const MIN_POSTS_FOR_LOOP = 3;

export function FeedClient() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError,
    refetch,
  } = useFeedPosts({ tag: null });

  const posts = useMemo(
    () => (data?.pages.flatMap((page) => page.posts) ?? []) as FeedPost[],
    [data]
  );

  // Detect when the shrinking header spacer (40svh) is fully scrolled past
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  useEffect(() => {
    if (headerCollapsed) return; // once active, stay active

    const handler = () => {
      const threshold = window.innerHeight * 0.4; // 40svh spacer height
      if (window.scrollY >= threshold) {
        setHeaderCollapsed(true);
      }
    };

    handler(); // check immediately (page may have loaded already scrolled)
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [headerCollapsed]);

  const loopEnabled = headerCollapsed && posts.length >= MIN_POSTS_FOR_LOOP;

  if (isError && posts.length === 0) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-4 py-20 text-center"
      >
        <div>
          <h2 className="font-heading text-xl text-foreground">
            Couldn&rsquo;t load the feed
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong reaching the server. Give it another try.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="secondary">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <LoopScrollContainer posts={posts} enabled={loopEnabled}>
      <FeedGrid
        posts={posts}
        hasMore={hasNextPage}
        loading={isFetchingNextPage || (isFetching && posts.length === 0)}
        onLoadMore={() => fetchNextPage()}
      />
    </LoopScrollContainer>
  );
}
