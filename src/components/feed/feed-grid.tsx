"use client";

import { useEffect, useRef } from "react";
import Masonry from "react-masonry-css";

import { Skeleton } from "@/components/ui/skeleton";
import { ExperimentCard, type FeedPost } from "./experiment-card";

const BREAKPOINT_COLS = {
  default: 3,
  1024: 2,
  640: 1,
};

interface FeedGridProps {
  posts: FeedPost[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function FeedGrid({ posts, hasMore, loading, onLoadMore }: FeedGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (posts.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold text-foreground">
          No experiments yet
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Be the first to share something.
        </p>
      </div>
    );
  }

  return (
    <>
      <Masonry
        breakpointCols={BREAKPOINT_COLS}
        className="masonry-grid"
        columnClassName="masonry-grid-column"
      >
        {posts.map((post) => (
          <ExperimentCard key={post.id} post={post} />
        ))}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={`skeleton-${i}`} />
          ))}
      </Masonry>

      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
